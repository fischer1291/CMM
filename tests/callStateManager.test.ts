import CallStateManager, { INCOMING_RING_TIMEOUT_MS } from '../services/CallStateManager';

const incoming = (channel: string, callId?: string) => ({
  callId,
  channel,
  callerPhone: '+4915111111111',
  calleePhone: '+4915222222222',
  hasVideo: true,
});

beforeEach(() => {
  jest.useFakeTimers();
  CallStateManager.reset();
  CallStateManager.removeAllListeners();
});

afterEach(() => {
  CallStateManager.reset();
  jest.useRealTimers();
});

test('an incoming call gets a lower-case UUID, a known id is kept', () => {
  const call = CallStateManager.createIncomingCall(incoming('call_a', 'ABCDEF01-0000-4000-8000-000000000000'));
  expect(call?.callId).toBe('abcdef01-0000-4000-8000-000000000000');
  CallStateManager.reset();
  const generated = CallStateManager.createIncomingCall(incoming('call_b'));
  expect(generated?.callId).toMatch(/^[0-9a-f-]{36}$/);
});

test('the same channel announced twice (socket + VoIP push) is one call', () => {
  const first = CallStateManager.createIncomingCall(incoming('call_a', '11111111-1111-4111-8111-111111111111'));
  const second = CallStateManager.createIncomingCall(incoming('call_a', '22222222-2222-4222-8222-222222222222'));
  expect(second).toBe(first);
});

test('busy: a second call while one is ringing or active is rejected (null)', () => {
  CallStateManager.createIncomingCall(incoming('call_a'));
  expect(CallStateManager.createIncomingCall(incoming('call_b'))).toBeNull();
  CallStateManager.answerCall();
  expect(CallStateManager.createIncomingCall(incoming('call_c'))).toBeNull();
});

test('a leftover call that stopped ringing long ago does not block the next one', () => {
  const ended = jest.fn();
  CallStateManager.on('call:ended', ended);
  const old = CallStateManager.createIncomingCall(incoming('call_old'));
  // The ring timer would end it; simulate the state being left behind
  jest.setSystemTime(Date.now() + INCOMING_RING_TIMEOUT_MS + 1000);
  const fresh = CallStateManager.createIncomingCall(incoming('call_new'));
  expect(fresh?.channel).toBe('call_new');
  expect(ended).toHaveBeenCalledWith(expect.objectContaining({ channel: old?.channel }));
  expect(CallStateManager.getActiveCall()?.channel).toBe('call_new');
});

test('an unanswered call stops ringing on the device after the timeout', () => {
  const ended = jest.fn();
  CallStateManager.on('call:ended', ended);
  CallStateManager.createIncomingCall(incoming('call_a'));
  jest.advanceTimersByTime(INCOMING_RING_TIMEOUT_MS - 1);
  expect(ended).not.toHaveBeenCalled();
  jest.advanceTimersByTime(1);
  expect(ended).toHaveBeenCalledTimes(1);
  expect(CallStateManager.getActiveCall()).toBeNull();
});

test('an answered call is not ended by the ring timer', () => {
  CallStateManager.createIncomingCall(incoming('call_a'));
  CallStateManager.answerCall();
  jest.advanceTimersByTime(INCOMING_RING_TIMEOUT_MS * 2);
  expect(CallStateManager.getActiveCall()?.callState).toBe('active');
});

test('ending clears the call before listeners run (re-entrant end is a no-op)', () => {
  CallStateManager.on('call:ended', () => {
    expect(CallStateManager.endCall()).toBe(false);
  });
  CallStateManager.createIncomingCall(incoming('call_a'));
  expect(CallStateManager.endCall()).toBe(true);
});

test('declining emits call:declined with the call, then nothing is active', () => {
  const declined = jest.fn();
  CallStateManager.on('call:declined', declined);
  CallStateManager.createIncomingCall(incoming('call_a'));
  expect(CallStateManager.declineCall()).toBe(true);
  expect(declined).toHaveBeenCalledWith(expect.objectContaining({ channel: 'call_a', callerPhone: '+4915111111111' }));
  expect(CallStateManager.declineCall()).toBe(false);
});
