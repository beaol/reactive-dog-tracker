import { matchBreed, normalise, suggestBreeds, traitsFor } from '../matchBreed';

describe('matchBreed', () => {
  it('normalises punctuation, accents and filler words', () => {
    expect(normalise('  The Bichon Frisé dog! ')).toBe('bichon frise');
  });

  it.each([
    ['Labrador', 'Labrador Retriever'],
    ['lab', 'Labrador Retriever'],
    ['GSD', 'German Shepherd'],
    ['Staffy', 'Staffordshire Bull Terrier'],
    ['golden doodle', 'Goldendoodle'],
    ['sausage dog', 'Dachshund'],
  ])('matches %s exactly', (input, name) => {
    const m = matchBreed(input);
    expect(m.kind).toBe('exact');
    expect(m.label).toBe(name);
  });

  it('tolerates typos', () => {
    expect(matchBreed('labradore').label).toBe('Labrador Retriever');
    expect(matchBreed('chiuahua').label).toBe('Chihuahua');
    expect(matchBreed('dalmation').label).toBe('Dalmatian');
  });

  it('detects two-breed mixes', () => {
    const m = matchBreed('Husky x Lab mix');
    expect(m.kind).toBe('mix');
    expect(m.breeds.map((b) => b.name)).toEqual(['Siberian Husky', 'Labrador Retriever']);
    expect(m.variants.length).toBeGreaterThan(4);
  });

  it('labels single-breed mixes', () => {
    const m = matchBreed('beagle mix');
    expect(m.kind).toBe('mix');
    expect(m.label).toBe('Beagle mix');
  });

  it('finds a breed inside a longer phrase', () => {
    expect(matchBreed('rescued border collie from a farm').label).toBe('Border Collie');
  });

  it('generates a stable unique dog for unknown input', () => {
    const a = matchBreed('Romanian street dog', 'Luna');
    const b = matchBreed('Romanian street dog', 'Luna');
    expect(a.kind).toBe('unique');
    expect(a.label).toBe('Wonderful mix');
    expect(a.shape).toEqual(b.shape);
    expect(matchBreed('zzqx', 'Luna').label).toBe('One of a kind');
  });

  it('cycles coat variants safely', () => {
    const black = traitsFor('labrador', 1);
    const wrapped = traitsFor('labrador', 5);
    expect(black.colors.base).toBe(wrapped.colors.base);
  });

  it('suggests breeds while typing', () => {
    expect(suggestBreeds('bord')).toEqual(expect.arrayContaining(['Border Collie', 'Border Terrier']));
  });
});
