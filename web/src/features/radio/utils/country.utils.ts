// Convierte código ISO 3166-1 a emoji de bandera
export function getCountryFlag(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) {
    return '🏴';
  }

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

export function getCountryName(countryCode: string, apiCountryName?: string): string {
  if (apiCountryName) return apiCountryName;

  const countryNames: Record<string, string> = {
    ES: 'España',
    US: 'Estados Unidos',
    GB: 'Reino Unido',
    FR: 'Francia',
    DE: 'Alemania',
    IT: 'Italia',
    MX: 'México',
    AR: 'Argentina',
    BR: 'Brasil',
    JP: 'Japón',
    CA: 'Canadá',
    AU: 'Australia',
    IN: 'India',
    CN: 'China',
    RU: 'Rusia',
    PT: 'Portugal',
    NL: 'Países Bajos',
    BE: 'Bélgica',
    CH: 'Suiza',
    AT: 'Austria',
    SE: 'Suecia',
    NO: 'Noruega',
    DK: 'Dinamarca',
    FI: 'Finlandia',
    IE: 'Irlanda',
    PL: 'Polonia',
    GR: 'Grecia',
    TR: 'Turquía',
    IL: 'Israel',
    EG: 'Egipto',
    ZA: 'Sudáfrica',
    NZ: 'Nueva Zelanda',
    KR: 'Corea del Sur',
    TH: 'Tailandia',
    SG: 'Singapur',
    MY: 'Malasia',
    ID: 'Indonesia',
    PH: 'Filipinas',
    VN: 'Vietnam',
    CL: 'Chile',
    CO: 'Colombia',
    PE: 'Perú',
    VE: 'Venezuela',
    UY: 'Uruguay',
    CU: 'Cuba',
    CR: 'Costa Rica',
    PA: 'Panamá',
  };

  return countryNames[countryCode] || countryCode;
}
