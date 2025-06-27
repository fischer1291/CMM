// utils/contactResolver.ts
import { UserProfile } from '../contexts/AuthContext';

export interface ContactInfo {
  name: string;
  avatarUrl?: string;
  phone: string;
  source: 'user_profile' | 'device_contact' | 'formatted_phone';
}

export interface ContactResolutionOptions {
  deviceContacts?: Map<string, string>;
  userProfiles?: Map<string, UserProfile>;
  fallbackToFormatted?: boolean;
}

/**
 * Normalizes phone numbers to a consistent format
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/\s+/g, '').replace(/[^+\d]/g, '').replace(/^00/, '+');
}

/**
 * Formats a phone number for display when no name is available
 */
export function formatPhoneForDisplay(phone: string): string {
  const normalized = normalizePhone(phone);
  
  // For German numbers starting with +49
  if (normalized.startsWith('+49')) {
    const digits = normalized.replace('+49', '');
    if (digits.length >= 4) {
      return `Kontakt ${digits.slice(-4)}`;
    }
  }
  
  // For other international numbers
  if (normalized.startsWith('+') && normalized.length > 7) {
    const digits = normalized.replace(/\D/g, '');
    return `+${digits.slice(0, -4)}****${digits.slice(-4)}`;
  }
  
  // Fallback
  return normalized || 'Unbekannt';
}

/**
 * Resolves a phone number to contact information using multiple sources
 */
export function resolveContact(
  phone: string,
  options: ContactResolutionOptions = {}
): ContactInfo {
  const {
    deviceContacts = new Map(),
    userProfiles = new Map(),
    fallbackToFormatted = true
  } = options;

  const normalizedPhone = normalizePhone(phone);

  // 1. Try to resolve from user profiles first (most accurate)
  const userProfile = userProfiles.get(normalizedPhone);
  if (userProfile && userProfile.name) {
    return {
      name: userProfile.name,
      avatarUrl: userProfile.avatarUrl || undefined,
      phone: normalizedPhone,
      source: 'user_profile'
    };
  }

  // 2. Try to resolve from device contacts
  const deviceContactName = deviceContacts.get(normalizedPhone);
  if (deviceContactName) {
    return {
      name: deviceContactName,
      phone: normalizedPhone,
      source: 'device_contact'
    };
  }

  // 3. Fallback to formatted phone number
  if (fallbackToFormatted) {
    return {
      name: formatPhoneForDisplay(normalizedPhone),
      phone: normalizedPhone,
      source: 'formatted_phone'
    };
  }

  // 4. Ultimate fallback
  return {
    name: normalizedPhone || 'Unbekannt',
    phone: normalizedPhone,
    source: 'formatted_phone'
  };
}

/**
 * Resolves multiple contacts at once for better performance
 */
export function resolveContacts(
  phones: string[],
  options: ContactResolutionOptions = {}
): ContactInfo[] {
  return phones.map(phone => resolveContact(phone, options));
}

/**
 * Creates a contact resolution function with pre-configured options
 * Useful for binding to specific contexts (e.g., a component that has device contacts loaded)
 */
export function createContactResolver(options: ContactResolutionOptions) {
  return (phone: string): ContactInfo => resolveContact(phone, options);
}

/**
 * Generates an avatar URL for a contact if they don't have one
 * Uses a service like UI Avatars as fallback
 */
export function generateAvatarUrl(name: string, existingUrl?: string): string {
  // Check if existingUrl is a valid web URL (not a local file path)
  if (existingUrl && existingUrl.trim() !== '') {
    // Only use existing URL if it's a web URL (http/https)
    if (existingUrl.startsWith('http://') || existingUrl.startsWith('https://')) {
      return existingUrl;
    }
    // If it's a local file path (file://), fall through to generate avatar
  }
  
  // Clean the name for better avatar generation
  const cleanName = name.trim() || 'User';
  const encodedName = encodeURIComponent(cleanName);
  
  // Use UI Avatars service as fallback with better parameters
  return `https://ui-avatars.com/api/?name=${encodedName}&background=007AFF&color=ffffff&rounded=true&size=128&format=png`;
}

/**
 * Hook-like function for React components to resolve contacts
 * This can be used in components that need contact resolution
 */
export function useContactResolver(
  deviceContacts: Map<string, string> = new Map(),
  userProfiles: Map<string, UserProfile> = new Map()
) {
  const resolver = createContactResolver({
    deviceContacts,
    userProfiles,
    fallbackToFormatted: true
  });

  return {
    resolveContact: resolver,
    resolveContacts: (phones: string[]) => resolveContacts(phones, {
      deviceContacts,
      userProfiles,
      fallbackToFormatted: true
    }),
    normalizePhone,
    formatPhoneForDisplay,
    generateAvatarUrl
  };
}