/**
 * RFC 4122 version 4 UUID.
 * CallKit (via react-native-callkeep) parses call ids with NSUUID and crashes
 * on anything that is not a valid UUID, so call ids must use this format.
 * Math.random is sufficient here: the id only has to be unique per device,
 * it is not a security token.
 */
export function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
