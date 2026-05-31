import {
  buildProfileExportPayload,
  loadProfilesFromStorage,
  parseImportedProfileDocument,
  saveProfilesToStorage,
} from '../inundationProfileStorage';
import { resetProfileToDefaults } from '../../domain/inundation/profiles';

describe('inundationProfileStorage', () => {
  test('saves and loads profile collections', () => {
    const profile = resetProfileToDefaults('cook-islands-default');
    const storage = {
      data: {},
      getItem(key) { return this.data[key] ?? null; },
      setItem(key, value) { this.data[key] = value; },
    };

    expect(saveProfilesToStorage([profile], profile.profileId, storage)).toBe(true);
    const loaded = loadProfilesFromStorage(storage);

    expect(loaded.activeProfileId).toBe(profile.profileId);
    expect(loaded.profiles[0].profileId).toBe(profile.profileId);
  });

  test('builds export payload and parses imported documents', () => {
    const profile = resetProfileToDefaults('cook-islands-default');
    const payload = buildProfileExportPayload(profile);
    const parsed = parseImportedProfileDocument(payload);

    expect(payload.profileId).toBe(profile.profileId);
    expect(Array.isArray(payload.auditLog)).toBe(true);
    expect(parsed.ok).toBe(true);
    expect(parsed.payload.categories).toHaveLength(profile.categories.length);
  });

  test('rejects invalid imported documents', () => {
    const parsed = parseImportedProfileDocument({ categories: [{ thresholdM: 'bad' }] });

    expect(parsed.ok).toBe(false);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});
