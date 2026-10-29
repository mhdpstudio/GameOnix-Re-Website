// Email validation and typo correction helpers.
//
// The suggestion engine compares the typed domain with the most popular email
// providers and returns the closest match, so "ali@gamil.com" becomes
// "ali@gmail.com" and "ali@outlok.com" becomes "ali@outlook.com".

const COMMON_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.sa",
  "hotmail.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "ymail.com",
  "yahoo.co.uk",
  "hotmail.co.uk",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
  "tutanota.com",
  "fastmail.com",
  "hey.com",
];

// Used to recover domains typed without the dot: "ali@gmailcom" -> gmail.com
const KNOWN_TOP_LEVEL_DOMAINS = ["com", "net", "org", "me", "sa", "co", "io"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_PART_LENGTH = 64;

function normalize(value) {
  return String(value ?? "").trim();
}

// Damerau-Levenshtein distance: adjacent swapped letters count as one edit,
// which is what catches "gamil" -> "gmail".
function editDistance(first, second) {
  const rows = first.length + 1;
  const columns = second.length + 1;
  const grid = Array.from({ length: rows }, () =>
    new Array(columns).fill(0)
  );

  for (let row = 0; row < rows; row += 1) grid[row][0] = row;
  for (let column = 0; column < columns; column += 1) {
    grid[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;

      grid[row][column] = Math.min(
        grid[row - 1][column] + 1,
        grid[row][column - 1] + 1,
        grid[row - 1][column - 1] + cost
      );

      const isSwap =
        row > 1 &&
        column > 1 &&
        first[row - 1] === second[column - 2] &&
        first[row - 2] === second[column - 1];

      if (isSwap) {
        grid[row][column] = Math.min(
          grid[row][column],
          grid[row - 2][column - 2] + 1
        );
      }
    }
  }

  return grid[first.length][second.length];
}

// Shorter provider names are only matched when they are almost identical,
// which keeps unusual but valid domains from being "corrected".
function toleranceFor(domain) {
  const providerName = domain.split(".")[0];

  if (providerName.length >= 7) return 2;
  if (providerName.length >= 4) return 1;
  return 0;
}

function findClosestProvider(domain) {
  let bestMatch = null;

  for (const provider of COMMON_EMAIL_DOMAINS) {
    const distance = editDistance(domain, provider);

    if (distance === 0) continue;

    if (distance > toleranceFor(provider)) continue;

    if (!bestMatch || distance < bestMatch.distance) {
      bestMatch = { domain: provider, distance };
    }
  }

  return bestMatch ? bestMatch.domain : null;
}

function candidateDomains(domain) {
  if (domain.includes(".")) return [domain];

  const candidates = [`${domain}.com`];
  const missingDot = KNOWN_TOP_LEVEL_DOMAINS.find(
    (topLevelDomain) =>
      domain.endsWith(topLevelDomain) &&
      domain.length > topLevelDomain.length
  );

  if (missingDot) {
    candidates.push(
      `${domain.slice(0, -missingDot.length)}.${missingDot}`
    );
  }

  return candidates;
}

export function isValidEmail(value) {
  const email = normalize(value);

  if (!email || email.length > MAX_EMAIL_LENGTH) return false;
  if (!EMAIL_PATTERN.test(email)) return false;

  const [localPart, domain] = email.split("@");

  if (!localPart || localPart.length > MAX_LOCAL_PART_LENGTH) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".")) return false;
  if (localPart.includes("..")) return false;

  return domain.split(".").every((label) => label.length > 0);
}

// Returns the corrected email address, or null when the domain looks fine.
export function suggestEmailCorrection(value) {
  const email = normalize(value);
  const atIndex = email.lastIndexOf("@");

  if (atIndex <= 0) return null;

  const localPart = email.slice(0, atIndex).trim();
  const domain = email.slice(atIndex + 1).trim().toLowerCase();

  if (!localPart || !domain || /\s/.test(domain)) return null;
  if (COMMON_EMAIL_DOMAINS.includes(domain)) return null;

  for (const candidate of candidateDomains(domain)) {
    // The typed domain only needed a missing dot or TLD.
    if (COMMON_EMAIL_DOMAINS.includes(candidate)) {
      return `${localPart}@${candidate}`;
    }

    const provider = findClosestProvider(candidate);

    if (provider) return `${localPart}@${provider}`;
  }

  return null;
}

// Suggestions are shown while typing only once the domain looks finished,
// otherwise "ali@gm" would be "corrected" to gmx.com mid-typing.
export function hasTypedDomain(value) {
  const email = normalize(value);
  const atIndex = email.lastIndexOf("@");

  if (atIndex <= 0) return false;

  return email.slice(atIndex + 1).includes(".");
}
