/**
 * Fallback Indian states/cities when /locations API is unreachable (offline dev, proxy misconfig).
 * Kept in sync with backend LocationService reference lists.
 */
export const FALLBACK_INDIAN_STATES: string[] = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

/** Common cities keyed by state name (case-insensitive lookup in service). */
export const FALLBACK_CITIES_BY_STATE: Record<string, string[]> = {
  Maharashtra: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad'],
  Karnataka: ['Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Belagavi'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
  Telangana: ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar'],
  Gujarat: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar'],
  Delhi: ['New Delhi', 'Delhi'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Siliguri'],
  Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Noida', 'Ghaziabad', 'Varanasi', 'Agra'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior'],
  Kerala: ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur'],
  Punjab: ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar'],
  Haryana: ['Gurugram', 'Faridabad', 'Panipat', 'Ambala'],
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore'],
  Bihar: ['Patna', 'Gaya', 'Muzaffarpur', 'Bhagalpur'],
  Odisha: ['Bhubaneswar', 'Cuttack', 'Rourkela'],
  Assam: ['Guwahati', 'Silchar', 'Dibrugarh'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad']
};

/** All fallback cities (deduped) when no state is selected yet. */
export function allFallbackCities(): string[] {
  const set = new Set<string>();
  Object.values(FALLBACK_CITIES_BY_STATE).forEach(list => list.forEach(c => set.add(c)));
  return [...set].sort((a, b) => a.localeCompare(b));
}

/** Resolve cities for a state using case-insensitive key match. */
export function fallbackCitiesForState(state?: string): string[] {
  if (!state?.trim()) {
    return allFallbackCities();
  }
  const key = Object.keys(FALLBACK_CITIES_BY_STATE).find(
    k => k.toLowerCase() === state.trim().toLowerCase()
  );
  return key ? [...FALLBACK_CITIES_BY_STATE[key]] : [];
}
