// International dialling codes keyed by ISO 3166-1 alpha-2 region. Country names are not stored here:
// they come from Intl.DisplayNames so the list follows the site language automatically.

export const DEFAULT_COUNTRY = 'IN'

const RAW = 'AF93 AL355 DZ213 AS1684 AD376 AO244 AI1264 AG1268 AR54 AM374 AW297 AU61 AT43 AZ994 BS1242 BH973 BD880 '
  + 'BB1246 BY375 BE32 BZ501 BJ229 BM1441 BT975 BO591 BA387 BW267 BR55 IO246 VG1284 BN673 BG359 BF226 BI257 KH855 '
  + 'CM237 CA1 CV238 KY1345 CF236 TD235 CL56 CN86 CO57 KM269 CG242 CD243 CK682 CR506 CI225 HR385 CU53 CW599 CY357 '
  + 'CZ420 DK45 DJ253 DM1767 DO1809 EC593 EG20 SV503 GQ240 ER291 EE372 SZ268 ET251 FK500 FO298 FJ679 FI358 FR33 '
  + 'GF594 PF689 GA241 GM220 GE995 DE49 GH233 GI350 GR30 GL299 GD1473 GP590 GU1671 GT502 GG44 GN224 GW245 GY592 '
  + 'HT509 HN504 HK852 HU36 IS354 IN91 ID62 IR98 IQ964 IE353 IM44 IL972 IT39 JM1876 JP81 JE44 JO962 KZ7 KE254 '
  + 'KI686 XK383 KW965 KG996 LA856 LV371 LB961 LS266 LR231 LY218 LI423 LT370 LU352 MO853 MG261 MW265 MY60 MV960 '
  + 'ML223 MT356 MH692 MQ596 MR222 MU230 YT262 MX52 FM691 MD373 MC377 MN976 ME382 MS1664 MA212 MZ258 MM95 NA264 '
  + 'NR674 NP977 NL31 NC687 NZ64 NI505 NE227 NG234 NU683 KP850 MK389 MP1670 NO47 OM968 PK92 PW680 PS970 PA507 '
  + 'PG675 PY595 PE51 PH63 PL48 PT351 PR1787 QA974 RE262 RO40 RU7 RW250 BL590 SH290 KN1869 LC1758 MF590 PM508 '
  + 'VC1784 WS685 SM378 ST239 SA966 SN221 RS381 SC248 SL232 SG65 SX1721 SK421 SI386 SB677 SO252 ZA27 KR82 SS211 '
  + 'ES34 LK94 SD249 SR597 SE46 CH41 SY963 TW886 TJ992 TZ255 TH66 TL670 TG228 TK690 TO676 TT1868 TN216 TR90 TM993 '
  + 'TC1649 TV688 UG256 UA380 AE971 GB44 US1 UY598 UZ998 VI1340 VU678 VA39 VE58 VN84 WF681 YE967 ZM260 ZW263'

// English names are stored (not computed) so the pre-rendered HTML and the browser's first render match
// exactly — Node and browsers ship different Intl data. Other languages use Intl.DisplayNames.
const EN_NAMES = 'AF=Afghanistan|AL=Albania|DZ=Algeria|AS=American Samoa|AD=Andorra|AO=Angola|AI=Anguilla|AG=Antigua & Barbuda'
  + '|AR=Argentina|AM=Armenia|AW=Aruba|AU=Australia|AT=Austria|AZ=Azerbaijan|BS=Bahamas|BH=Bahrain|BD=Bangladesh'
  + '|BB=Barbados|BY=Belarus|BE=Belgium|BZ=Belize|BJ=Benin|BM=Bermuda|BT=Bhutan|BO=Bolivia|BA=Bosnia & Herzegovina'
  + '|BW=Botswana|BR=Brazil|IO=British Indian Ocean Territory|VG=British Virgin Islands|BN=Brunei|BG=Bulgaria'
  + '|BF=Burkina Faso|BI=Burundi|KH=Cambodia|CM=Cameroon|CA=Canada|CV=Cape Verde|KY=Cayman Islands'
  + '|CF=Central African Republic|TD=Chad|CL=Chile|CN=China|CO=Colombia|KM=Comoros|CG=Congo - Brazzaville'
  + '|CD=Congo - Kinshasa|CK=Cook Islands|CR=Costa Rica|CI=Côte d’Ivoire|HR=Croatia|CU=Cuba|CW=Curaçao|CY=Cyprus'
  + '|CZ=Czechia|DK=Denmark|DJ=Djibouti|DM=Dominica|DO=Dominican Republic|EC=Ecuador|EG=Egypt|SV=El Salvador'
  + '|GQ=Equatorial Guinea|ER=Eritrea|EE=Estonia|SZ=Eswatini|ET=Ethiopia|FK=Falkland Islands|FO=Faroe Islands'
  + '|FJ=Fiji|FI=Finland|FR=France|GF=French Guiana|PF=French Polynesia|GA=Gabon|GM=Gambia|GE=Georgia|DE=Germany'
  + '|GH=Ghana|GI=Gibraltar|GR=Greece|GL=Greenland|GD=Grenada|GP=Guadeloupe|GU=Guam|GT=Guatemala|GG=Guernsey'
  + '|GN=Guinea|GW=Guinea-Bissau|GY=Guyana|HT=Haiti|HN=Honduras|HK=Hong Kong SAR China|HU=Hungary|IS=Iceland'
  + '|IN=India|ID=Indonesia|IR=Iran|IQ=Iraq|IE=Ireland|IM=Isle of Man|IL=Israel|IT=Italy|JM=Jamaica|JP=Japan'
  + '|JE=Jersey|JO=Jordan|KZ=Kazakhstan|KE=Kenya|KI=Kiribati|XK=Kosovo|KW=Kuwait|KG=Kyrgyzstan|LA=Laos|LV=Latvia'
  + '|LB=Lebanon|LS=Lesotho|LR=Liberia|LY=Libya|LI=Liechtenstein|LT=Lithuania|LU=Luxembourg|MO=Macao SAR China'
  + '|MG=Madagascar|MW=Malawi|MY=Malaysia|MV=Maldives|ML=Mali|MT=Malta|MH=Marshall Islands|MQ=Martinique'
  + '|MR=Mauritania|MU=Mauritius|YT=Mayotte|MX=Mexico|FM=Micronesia|MD=Moldova|MC=Monaco|MN=Mongolia|ME=Montenegro'
  + '|MS=Montserrat|MA=Morocco|MZ=Mozambique|MM=Myanmar (Burma)|NA=Namibia|NR=Nauru|NP=Nepal|NL=Netherlands'
  + '|NC=New Caledonia|NZ=New Zealand|NI=Nicaragua|NE=Niger|NG=Nigeria|NU=Niue|KP=North Korea|MK=North Macedonia'
  + '|MP=Northern Mariana Islands|NO=Norway|OM=Oman|PK=Pakistan|PW=Palau|PS=Palestinian Territories|PA=Panama'
  + '|PG=Papua New Guinea|PY=Paraguay|PE=Peru|PH=Philippines|PL=Poland|PT=Portugal|PR=Puerto Rico|QA=Qatar'
  + '|RE=Réunion|RO=Romania|RU=Russia|RW=Rwanda|BL=St. Barthélemy|SH=St. Helena|KN=St. Kitts & Nevis|LC=St. Lucia'
  + '|MF=St. Martin|PM=St. Pierre & Miquelon|VC=St. Vincent & Grenadines|WS=Samoa|SM=San Marino'
  + '|ST=São Tomé & Príncipe|SA=Saudi Arabia|SN=Senegal|RS=Serbia|SC=Seychelles|SL=Sierra Leone|SG=Singapore'
  + '|SX=Sint Maarten|SK=Slovakia|SI=Slovenia|SB=Solomon Islands|SO=Somalia|ZA=South Africa|KR=South Korea'
  + '|SS=South Sudan|ES=Spain|LK=Sri Lanka|SD=Sudan|SR=Suriname|SE=Sweden|CH=Switzerland|SY=Syria|TW=Taiwan'
  + '|TJ=Tajikistan|TZ=Tanzania|TH=Thailand|TL=Timor-Leste|TG=Togo|TK=Tokelau|TO=Tonga|TT=Trinidad & Tobago'
  + '|TN=Tunisia|TR=Türkiye|TM=Turkmenistan|TC=Turks & Caicos Islands|TV=Tuvalu|UG=Uganda|UA=Ukraine'
  + '|AE=United Arab Emirates|GB=United Kingdom|US=United States|UY=Uruguay|UZ=Uzbekistan|VI=U.S. Virgin Islands'
  + '|VU=Vanuatu|VA=Vatican City|VE=Venezuela|VN=Vietnam|WF=Wallis & Futuna|YE=Yemen|ZM=Zambia|ZW=Zimbabwe'
const ENGLISH = Object.fromEntries(EN_NAMES.split('|').map((entry) => entry.split('=')))

/** @type {Record<string, string>} ISO region → dialling code without "+". */
export const DIAL_CODES = Object.fromEntries(RAW.split(' ').map((entry) => [entry.slice(0, 2), entry.slice(2)]))

/**
 * Countries with localized names, India first and the rest alphabetical in the given language.
 * @param {string} lang
 * @returns {{ iso: string, dial: string, name: string }[]}
 */
export function getCountryOptions(lang) {
  let names = null
  if (lang !== 'en') try { names = new Intl.DisplayNames([lang, 'en'], { type: 'region' }) } catch { /* fall back to English */ }
  const nameOf = (iso) => { try { return names?.of(iso) || ENGLISH[iso] || iso } catch { return ENGLISH[iso] || iso } }
  const all = Object.entries(DIAL_CODES).map(([iso, dial]) => ({ iso, dial, name: nameOf(iso) }))
  // Plain code-point order for English (identical everywhere); locale-aware order for other languages.
  const compare = lang === 'en' ? (a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0) : (a, b) => a.name.localeCompare(b.name, lang)
  const rest = all.filter((c) => c.iso !== DEFAULT_COUNTRY).sort(compare)
  return [all.find((c) => c.iso === DEFAULT_COUNTRY), ...rest]
}
