// Plan 2.14: the marketing agent learns from its posted videos (top and flop
// by views per euro and by activation), names this week's bio link, uploads
// two hook variants per draft, reports how long a run took, and the workflow
// reports a failed run. prompt.js pulls in the agent's own dependencies
// (marketing/package.json), so the helpers are tested directly, common.js
// with a fake fetch, and the wiring through the source.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { performanceSection, linksNote, viewsNote, hookVariants, runSeconds, MAX_HOOK, MAX_ROWS } from '../marketing/agent/performance';

const ROOT = path.join(__dirname, '..');
const AGENT = path.join(ROOT, 'marketing/agent');
const source = (file: string) => fs.readFileSync(path.join(AGENT, file), 'utf8');

const row = (over: Record<string, unknown> = {}) => ({
  campaign: 'yap-0929-oma-sonntag',
  title: 'Oma ruft zurück',
  template: 'story',
  kind: 'app',
  postedAt: '2026-09-29T10:00:00.000Z',
  views: 12400,
  likes: 310,
  shares: 12,
  costEur: 0.18,
  viewsPerEur: 68888.9,
  newUsers: 0,
  activatedD7: 0,
  ...over,
});

describe('performance section', () => {
  test('no posted video with numbers, no section', () => {
    expect(performanceSection({})).toBe('');
    expect(performanceSection(null)).toBe('');
    expect(performanceSection({ performance: { top: [], flop: [] }, aiCostPerPostedVideoEur: 0.4 })).toBe('');
    expect(performanceSection({ performance: { top: [{}], flop: 'x' } })).toBe('');
  });

  test('top and flop with views per euro, people and the AI cost per posted video', () => {
    const out = performanceSection({
      performance: {
        top: [row({ newUsers: 3, activatedD7: 1 })],
        flop: [row({ campaign: 'yap-0930-jonas-schicht', title: 'Jonas, 23:14', kind: 'hero', template: 'hero', views: 800, likes: 0, shares: 0, costEur: 9.4, viewsPerEur: 85.1 })],
      },
      aiCostPerPostedVideoEur: 2.35,
    });
    expect(out.startsWith('# Was gewirkt hat (30 Tage)\n')).toBe(true);
    expect(out).toContain('Vorne (meiste Views je Euro):\n- yap-0929-oma-sonntag · app/story · „Oma ruft zurück“ · 12.400 Views (310 Likes, 12 geteilt) · 0,18 € · 68.889 Views/€ · 3 neu dabei, 1 davon aktiviert');
    expect(out).toContain('Hinten (wenigste Views je Euro):\n- yap-0930-jonas-schicht · hero/hero · „Jonas, 23:14“ · 800 Views · 9,40 € · 85 Views/€\n');
    // Only videos that brought people are ranked by activation
    expect(out).toContain('Nach Aktivierung (wer über das Video kam und wirklich telefoniert hat):\n- yap-0929-oma-sonntag');
    expect(out).not.toMatch(/Nach Aktivierung[^#]*jonas-schicht/);
    expect(out).toContain('KI-Kosten je tatsächlich gepostetes Video: 2,35 €');
    expect(out).toContain('Bewerte Formate nach Aktivierung, nicht nach Views');
    // Ends with a blank line, so the next heading of the prompt stays separate
    expect(out.endsWith('\n\n')).toBe(true);
  });

  test('without people and without an AI cost those lines stay out', () => {
    const out = performanceSection({ performance: { top: [row()], flop: [] }, aiCostPerPostedVideoEur: null });
    expect(out).toContain('Vorne (meiste Views je Euro):');
    expect(out).not.toContain('Hinten');
    expect(out).not.toContain('Nach Aktivierung (');
    expect(out).not.toContain('KI-Kosten je');
  });

  test('ranks by activation first, then by new people', () => {
    const out = performanceSection({
      performance: {
        top: [row({ campaign: 'a-viele', newUsers: 9, activatedD7: 1 }), row({ campaign: 'b-aktiv', newUsers: 4, activatedD7: 3 })],
        flop: [row({ campaign: 'c-neu', newUsers: 5, activatedD7: 1 })],
      },
    });
    const list = out.split('Nach Aktivierung')[1];
    expect(list.indexOf('b-aktiv')).toBeLessThan(list.indexOf('a-viele'));
    expect(list.indexOf('a-viele')).toBeLessThan(list.indexOf('c-neu'));
  });

  test('at most ten videos per list, long titles cut', () => {
    const many = Array.from({ length: 15 }, (_, i) => row({ campaign: `yap-${i}`, title: 'x'.repeat(200) }));
    const out = performanceSection({ performance: { top: many, flop: [] } });
    expect(out.match(/^- yap-/gm)).toHaveLength(MAX_ROWS);
    expect(out).toContain(`„${'x'.repeat(80)}“`);
    expect(out).not.toContain('x'.repeat(81));
  });

  test('views of an earlier draft for its history line', () => {
    expect(viewsNote({})).toBe('');
    expect(viewsNote({ stats: null })).toBe('');
    expect(viewsNote({ stats: { instagram: { plays: 1200 }, tiktok: null } })).toBe(' · 1.200 Views');
    expect(viewsNote({ stats: { instagram: { plays: 1200 }, tiktok: { views: 34 } } })).toBe(' · 1.234 Views');
  });
});

describe('bio link', () => {
  test('names this week\'s bio link when the backend sends one', () => {
    expect(linksNote('https://wannayap.app/k/bio-2026-w40')).toBe(
      'Links in Captions sind nicht klickbar; der Bio-Link dieser Woche ist https://wannayap.app/k/bio-2026-w40 (eine eigene Kampagne pro Woche), die meisten Besuche kommen über ihn. Schreib keine Links in die Captions; „Link in Bio“ nur ab und zu.',
    );
  });

  test('without one, the old hint', () => {
    for (const value of [undefined, null, '', 'javascript:alert(1)', 'https://x y']) {
      expect(linksNote(value)).toBe('Links in Captions sind nicht klickbar, die meisten Besuche kommen über den Bio-Link.');
    }
  });
});

describe('hook variants', () => {
  test('cleaned to what the backend takes', () => {
    expect(hookVariants(undefined)).toEqual([]);
    expect(hookVariants('Hook')).toEqual([]);
    expect(hookVariants(['  Du rufst  NIE zurück. ', '', 42, 'POV: Oma kann FaceTime', 'drei'])).toEqual(['Du rufst NIE zurück.', 'POV: Oma kann FaceTime']);
    expect(hookVariants(['x'.repeat(200)])[0]).toHaveLength(MAX_HOOK);
  });

  test('both schemas ask for exactly two, saved plans load without', () => {
    const app = source('schema.js');
    expect(app).toContain('hookVariants: hooks');
    expect(app).toMatch(/HookVariants = z[\s\S]*?\.length\(2\)/);
    expect(app).toContain('z.array(z.string()).max(2).optional()');
    const hero = source('hero-schema.js');
    expect(hero).toMatch(/hookVariants: z[\s\S]*?\.length\(2\)/);
    expect(hero).toContain('SavedHeroPlan = HeroPlan.extend({ hookVariants:');
    expect(source('hero.js')).toContain('SavedHeroPlan.parse(savedPlan(PLAN_FILE))');
  });

  test('daily and hero runs upload them', () => {
    expect(source('daily.js')).toContain('hookVariants: draft.hookVariants');
    expect(source('hero.js')).toContain('hookVariants: plan.hookVariants');
  });
});

describe('prompts', () => {
  test('both prompts carry performance and the bio link', () => {
    for (const file of ['prompt.js', 'hero-prompt.js']) {
      const text = source(file);
      expect(text).toContain("require('./performance')");
      expect(text).toContain('${performanceSection(context)}');
      expect(text).toContain('${linksNote(context.bioLink)}');
      expect(text).toContain('${viewsNote(d)}');
      expect(text).toContain('Hook-Varianten (hookVariants)');
    }
  });
});

describe('run reports', () => {
  const realFetch = global.fetch;
  let calls: { url: string; init: any }[];

  beforeEach(() => {
    calls = [];
    process.env.MARKETING_AGENT_KEY = 'agent-key';
    process.env.API_URL = 'https://api.example.test/';
    global.fetch = jest.fn(async (url: any, init: any) => {
      calls.push({ url: String(url), init });
      const route = String(url);
      const body = route.endsWith('/marketing/drafts') ? { success: true, draft: { id: 'd1' } } : { success: true, pending: 2, mailed: 1 };
      return { ok: true, status: 200, json: async () => body } as any;
    }) as any;
  });
  afterEach(() => {
    global.fetch = realFetch;
    delete process.env.MARKETING_AGENT_KEY;
    delete process.env.API_URL;
  });

  const loadCommon = () => {
    let common: any;
    jest.isolateModules(() => {
      common = require('../marketing/agent/common');
    });
    return common;
  };

  test('whole seconds since the start', () => {
    expect(runSeconds(1_000, 62_400)).toBe(61);
    expect(runSeconds(5_000, 1_000)).toBe(0);
  });

  test('a run that went through tells the backend how long it took', async () => {
    const { reportRun } = loadCommon();
    const result = await reportRun(Date.now() - 95_000);
    expect(result).toEqual({ success: true, pending: 2, mailed: 1 });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://api.example.test/marketing/notify');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers.Authorization).toBe('Bearer agent-key');
    const body = JSON.parse(calls[0].init.body);
    expect(Object.keys(body)).toEqual(['durationSec']);
    expect(body.durationSec).toBeGreaterThanOrEqual(95);
    expect(body.durationSec).toBeLessThan(100);
  });

  test('uploadDraft sends the cleaned hook variants with the draft', async () => {
    const { uploadDraft } = loadCommon();
    const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agent-')), 'v.mp4');
    fs.writeFileSync(file, 'mp4');
    const campaign = await uploadDraft('yap-1003-test', { kind: 'app', title: 'T', hookVariants: [' Eins ', 'Zwei', 'Drei'] }, file);
    expect(campaign).toBe('yap-1003-test');
    const draft = JSON.parse(calls[0].init.body);
    expect(draft).toMatchObject({ kind: 'app', title: 'T', campaign: 'yap-1003-test', hookVariants: ['Eins', 'Zwei'] });
    expect(calls[1].url).toBe('https://api.example.test/marketing/drafts/d1/video');
  });

  test('daily and hero end with reportRun', () => {
    for (const file of ['daily.js', 'hero.js']) {
      const text = source(file);
      expect(text).toContain('const STARTED = Date.now();');
      expect(text).toContain('await reportRun(STARTED)');
      expect(text).not.toContain("backend('POST', '/marketing/notify')");
    }
  });
});

describe('workflow', () => {
  const yml = fs.readFileSync(path.join(ROOT, '.github/workflows/marketing-agent.yml'), 'utf8');
  const step = yml.slice(yml.indexOf('- name: Fehlschlag melden'), yml.indexOf('- uses: actions/upload-artifact'));

  test('a failed run is reported to the backend', () => {
    expect(step).toContain('if: failure()');
    expect(step).toContain('MARKETING_AGENT_KEY: ${{ secrets.MARKETING_AGENT_KEY }}');
    // The same backend as agent/common.js
    expect(step).toContain('API="${API_URL:-https://api.wannayap.app}"');
    expect(source('common.js')).toContain("process.env.API_URL || 'https://api.wannayap.app'");
    expect(step).toContain('curl -fsS -X POST "$API/marketing/notify"');
    expect(step).toContain('-H "Authorization: Bearer $MARKETING_AGENT_KEY"');
    expect(step).toContain("'{failed: true, step: $step, runUrl: $runUrl}'");
    expect(step).toContain('$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID');
  });

  test('the agent step can time out before the job does, so the report still runs', () => {
    const agent = yml.slice(yml.indexOf('- name: Agent'), yml.indexOf('- name: Fehlschlag melden'));
    expect(agent).toContain('id: agent');
    expect(Number(agent.match(/timeout-minutes: (\d+)/)?.[1])).toBeLessThan(Number(yml.match(/^ {4}timeout-minutes: (\d+)/m)?.[1]));
  });
});
