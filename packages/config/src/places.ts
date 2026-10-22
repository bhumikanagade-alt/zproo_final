/**
 * Reference places used by search forms and the database seed. One list, so the web autocomplete
 * and the API agree on codes.
 *
 * ZPROO GO is built in Pune, so every list starts with Maharashtra (Pune first), then the rest of
 * India, then international destinations. Search suggestions keep this order.
 */

export const HOME_STATE = 'Maharashtra';

/** Heading a place is listed under in search suggestions. */
export type PlaceGroup = 'Maharashtra' | 'Across India' | 'International';

export function placeGroup(place: { state?: string; country?: string }): PlaceGroup {
  if (place.country && place.country !== 'India') return 'International';
  return place.state === HOME_STATE ? 'Maharashtra' : 'Across India';
}

// ───────────────────────────── Airports ─────────────────────────────

export interface Airport {
  /** IATA code */
  code: string;
  city: string;
  name: string;
  /** Indian state or union territory; empty for airports abroad. */
  state: string;
  country: string;
  /** Former or alternative names people search for, e.g. "Aurangabad". */
  aliases?: string;
  /** IANA time zone (defaults to Asia/Kolkata when omitted). */
  timezone?: string;
}

export const airportTimezone = (a: Airport) => a.timezone ?? 'Asia/Kolkata';

const IN = 'India';
const MH = HOME_STATE;

export const AIRPORTS: readonly Airport[] = [
  // Maharashtra
  {
    code: 'PNQ',
    city: 'Pune',
    name: 'Pune International Airport',
    state: MH,
    country: IN,
    aliases: 'Lohegaon',
  },
  {
    code: 'BOM',
    city: 'Mumbai',
    name: 'Chhatrapati Shivaji Maharaj International Airport',
    state: MH,
    country: IN,
    aliases: 'Bombay',
  },
  {
    code: 'NMI',
    city: 'Navi Mumbai',
    name: 'Navi Mumbai International Airport',
    state: MH,
    country: IN,
  },
  {
    code: 'NAG',
    city: 'Nagpur',
    name: 'Dr. Babasaheb Ambedkar International Airport',
    state: MH,
    country: IN,
  },
  {
    code: 'IXU',
    city: 'Chhatrapati Sambhajinagar',
    name: 'Chhatrapati Sambhajinagar Airport',
    state: MH,
    country: IN,
    aliases: 'Aurangabad',
  },
  { code: 'ISK', city: 'Nashik', name: 'Nashik Airport', state: MH, country: IN, aliases: 'Ozar' },
  { code: 'KLH', city: 'Kolhapur', name: 'Kolhapur Airport', state: MH, country: IN },
  { code: 'SAG', city: 'Shirdi', name: 'Shirdi Airport', state: MH, country: IN },
  {
    code: 'NDC',
    city: 'Nanded',
    name: 'Shri Guru Gobind Singh Ji Airport',
    state: MH,
    country: IN,
  },
  { code: 'JLG', city: 'Jalgaon', name: 'Jalgaon Airport', state: MH, country: IN },
  {
    code: 'SDW',
    city: 'Sindhudurg',
    name: 'Sindhudurg Airport',
    state: MH,
    country: IN,
    aliases: 'Chipi Malvan',
  },
  { code: 'SSE', city: 'Solapur', name: 'Solapur Airport', state: MH, country: IN },
  // Across India
  {
    code: 'DEL',
    city: 'New Delhi',
    name: 'Indira Gandhi International Airport',
    state: 'Delhi',
    country: IN,
  },
  {
    code: 'BLR',
    city: 'Bengaluru',
    name: 'Kempegowda International Airport',
    state: 'Karnataka',
    country: IN,
    aliases: 'Bangalore',
  },
  {
    code: 'HYD',
    city: 'Hyderabad',
    name: 'Rajiv Gandhi International Airport',
    state: 'Telangana',
    country: IN,
  },
  { code: 'GOI', city: 'Goa', name: 'Dabolim Airport', state: 'Goa', country: IN },
  {
    code: 'GOX',
    city: 'Goa',
    name: 'Manohar International Airport, Mopa',
    state: 'Goa',
    country: IN,
  },
  {
    code: 'MAA',
    city: 'Chennai',
    name: 'Chennai International Airport',
    state: 'Tamil Nadu',
    country: IN,
    aliases: 'Madras',
  },
  {
    code: 'CCU',
    city: 'Kolkata',
    name: 'Netaji Subhas Chandra Bose International Airport',
    state: 'West Bengal',
    country: IN,
    aliases: 'Calcutta',
  },
  {
    code: 'AMD',
    city: 'Ahmedabad',
    name: 'Sardar Vallabhbhai Patel International Airport',
    state: 'Gujarat',
    country: IN,
  },
  {
    code: 'IDR',
    city: 'Indore',
    name: 'Devi Ahilya Bai Holkar Airport',
    state: 'Madhya Pradesh',
    country: IN,
  },
  { code: 'BHO', city: 'Bhopal', name: 'Raja Bhoj Airport', state: 'Madhya Pradesh', country: IN },
  { code: 'STV', city: 'Surat', name: 'Surat Airport', state: 'Gujarat', country: IN },
  {
    code: 'BDQ',
    city: 'Vadodara',
    name: 'Vadodara Airport',
    state: 'Gujarat',
    country: IN,
    aliases: 'Baroda',
  },
  {
    code: 'RAJ',
    city: 'Rajkot',
    name: 'Rajkot International Airport',
    state: 'Gujarat',
    country: IN,
  },
  {
    code: 'HBX',
    city: 'Hubballi',
    name: 'Hubballi Airport',
    state: 'Karnataka',
    country: IN,
    aliases: 'Hubli',
  },
  {
    code: 'IXG',
    city: 'Belagavi',
    name: 'Belagavi Airport',
    state: 'Karnataka',
    country: IN,
    aliases: 'Belgaum',
  },
  {
    code: 'IXE',
    city: 'Mangaluru',
    name: 'Mangaluru International Airport',
    state: 'Karnataka',
    country: IN,
    aliases: 'Mangalore',
  },
  {
    code: 'COK',
    city: 'Kochi',
    name: 'Cochin International Airport',
    state: 'Kerala',
    country: IN,
    aliases: 'Cochin',
  },
  {
    code: 'TRV',
    city: 'Thiruvananthapuram',
    name: 'Trivandrum International Airport',
    state: 'Kerala',
    country: IN,
    aliases: 'Trivandrum',
  },
  {
    code: 'CJB',
    city: 'Coimbatore',
    name: 'Coimbatore International Airport',
    state: 'Tamil Nadu',
    country: IN,
  },
  { code: 'IXM', city: 'Madurai', name: 'Madurai Airport', state: 'Tamil Nadu', country: IN },
  {
    code: 'VTZ',
    city: 'Visakhapatnam',
    name: 'Visakhapatnam Airport',
    state: 'Andhra Pradesh',
    country: IN,
    aliases: 'Vizag',
  },
  {
    code: 'VGA',
    city: 'Vijayawada',
    name: 'Vijayawada Airport',
    state: 'Andhra Pradesh',
    country: IN,
  },
  { code: 'TIR', city: 'Tirupati', name: 'Tirupati Airport', state: 'Andhra Pradesh', country: IN },
  {
    code: 'JAI',
    city: 'Jaipur',
    name: 'Jaipur International Airport',
    state: 'Rajasthan',
    country: IN,
  },
  {
    code: 'UDR',
    city: 'Udaipur',
    name: 'Maharana Pratap Airport',
    state: 'Rajasthan',
    country: IN,
  },
  { code: 'JDH', city: 'Jodhpur', name: 'Jodhpur Airport', state: 'Rajasthan', country: IN },
  {
    code: 'LKO',
    city: 'Lucknow',
    name: 'Chaudhary Charan Singh International Airport',
    state: 'Uttar Pradesh',
    country: IN,
  },
  {
    code: 'VNS',
    city: 'Varanasi',
    name: 'Lal Bahadur Shastri International Airport',
    state: 'Uttar Pradesh',
    country: IN,
    aliases: 'Banaras Kashi',
  },
  {
    code: 'PAT',
    city: 'Patna',
    name: 'Jay Prakash Narayan International Airport',
    state: 'Bihar',
    country: IN,
  },
  { code: 'IXR', city: 'Ranchi', name: 'Birsa Munda Airport', state: 'Jharkhand', country: IN },
  {
    code: 'RPR',
    city: 'Raipur',
    name: 'Swami Vivekananda Airport',
    state: 'Chhattisgarh',
    country: IN,
  },
  {
    code: 'BBI',
    city: 'Bhubaneswar',
    name: 'Biju Patnaik International Airport',
    state: 'Odisha',
    country: IN,
  },
  {
    code: 'IXC',
    city: 'Chandigarh',
    name: 'Chandigarh International Airport',
    state: 'Chandigarh',
    country: IN,
  },
  {
    code: 'ATQ',
    city: 'Amritsar',
    name: 'Sri Guru Ram Dass Jee International Airport',
    state: 'Punjab',
    country: IN,
  },
  {
    code: 'DED',
    city: 'Dehradun',
    name: 'Jolly Grant Airport',
    state: 'Uttarakhand',
    country: IN,
    aliases: 'Rishikesh',
  },
  {
    code: 'SXR',
    city: 'Srinagar',
    name: 'Sheikh ul-Alam International Airport',
    state: 'Jammu and Kashmir',
    country: IN,
  },
  { code: 'IXJ', city: 'Jammu', name: 'Jammu Airport', state: 'Jammu and Kashmir', country: IN },
  {
    code: 'IXL',
    city: 'Leh',
    name: 'Kushok Bakula Rimpochee Airport',
    state: 'Ladakh',
    country: IN,
    aliases: 'Ladakh',
  },
  {
    code: 'KUU',
    city: 'Kullu–Manali',
    name: 'Bhuntar Airport',
    state: 'Himachal Pradesh',
    country: IN,
    aliases: 'Manali Kullu',
  },
  {
    code: 'IXB',
    city: 'Bagdogra',
    name: 'Bagdogra Airport',
    state: 'West Bengal',
    country: IN,
    aliases: 'Siliguri Darjeeling',
  },
  {
    code: 'GAU',
    city: 'Guwahati',
    name: 'Lokpriya Gopinath Bordoloi International Airport',
    state: 'Assam',
    country: IN,
  },
  {
    code: 'IXZ',
    city: 'Port Blair',
    name: 'Veer Savarkar International Airport',
    state: 'Andaman and Nicobar Islands',
    country: IN,
    aliases: 'Andaman',
  },
  // International
  {
    code: 'DXB',
    city: 'Dubai',
    name: 'Dubai International Airport',
    state: '',
    country: 'United Arab Emirates',
    timezone: 'Asia/Dubai',
  },
  {
    code: 'SIN',
    city: 'Singapore',
    name: 'Singapore Changi Airport',
    state: '',
    country: 'Singapore',
    timezone: 'Asia/Singapore',
  },
  {
    code: 'BKK',
    city: 'Bangkok',
    name: 'Suvarnabhumi Airport',
    state: '',
    country: 'Thailand',
    timezone: 'Asia/Bangkok',
  },
  {
    code: 'LHR',
    city: 'London',
    name: 'Heathrow Airport',
    state: '',
    country: 'United Kingdom',
    timezone: 'Europe/London',
  },
];

// ───────────────────────────── Cities (bus, hotel) ─────────────────────────────

export interface City {
  /** Stable slug, used in URLs and as the bus/hotel search key. */
  code: string;
  name: string;
  state: string;
  /** Former or alternative names people search for. */
  aliases?: string;
}

export const CITIES: readonly City[] = [
  // Maharashtra — major cities
  { code: 'pune', name: 'Pune', state: MH, aliases: 'Poona' },
  { code: 'mumbai', name: 'Mumbai', state: MH, aliases: 'Bombay' },
  { code: 'nagpur', name: 'Nagpur', state: MH },
  { code: 'nashik', name: 'Nashik', state: MH, aliases: 'Nasik' },
  { code: 'thane', name: 'Thane', state: MH },
  { code: 'navi-mumbai', name: 'Navi Mumbai', state: MH, aliases: 'Vashi Belapur' },
  { code: 'pimpri-chinchwad', name: 'Pimpri-Chinchwad', state: MH, aliases: 'PCMC Pune' },
  { code: 'sambhajinagar', name: 'Chhatrapati Sambhajinagar', state: MH, aliases: 'Aurangabad' },
  { code: 'kolhapur', name: 'Kolhapur', state: MH },
  { code: 'solapur', name: 'Solapur', state: MH, aliases: 'Sholapur' },
  { code: 'ahilyanagar', name: 'Ahilyanagar', state: MH, aliases: 'Ahmednagar' },
  { code: 'satara', name: 'Satara', state: MH },
  { code: 'sangli', name: 'Sangli', state: MH, aliases: 'Miraj' },
  { code: 'amravati', name: 'Amravati', state: MH },
  { code: 'akola', name: 'Akola', state: MH },
  { code: 'jalgaon', name: 'Jalgaon', state: MH },
  { code: 'latur', name: 'Latur', state: MH },
  { code: 'nanded', name: 'Nanded', state: MH },
  { code: 'kalyan', name: 'Kalyan-Dombivli', state: MH },
  { code: 'panvel', name: 'Panvel', state: MH },
  { code: 'vasai-virar', name: 'Vasai-Virar', state: MH },
  { code: 'dhule', name: 'Dhule', state: MH },
  { code: 'chandrapur', name: 'Chandrapur', state: MH },
  { code: 'jalna', name: 'Jalna', state: MH },
  { code: 'parbhani', name: 'Parbhani', state: MH },
  { code: 'beed', name: 'Beed', state: MH },
  { code: 'dharashiv', name: 'Dharashiv', state: MH, aliases: 'Osmanabad' },
  { code: 'yavatmal', name: 'Yavatmal', state: MH },
  { code: 'wardha', name: 'Wardha', state: MH },
  { code: 'gondia', name: 'Gondia', state: MH },
  { code: 'bhandara', name: 'Bhandara', state: MH },
  { code: 'buldhana', name: 'Buldhana', state: MH },
  { code: 'washim', name: 'Washim', state: MH },
  { code: 'hingoli', name: 'Hingoli', state: MH },
  { code: 'gadchiroli', name: 'Gadchiroli', state: MH },
  { code: 'nandurbar', name: 'Nandurbar', state: MH },
  { code: 'palghar', name: 'Palghar', state: MH },
  { code: 'ratnagiri', name: 'Ratnagiri', state: MH, aliases: 'Konkan' },
  { code: 'sindhudurg', name: 'Sindhudurg', state: MH, aliases: 'Kudal Oros Konkan' },
  { code: 'baramati', name: 'Baramati', state: MH },
  { code: 'karad', name: 'Karad', state: MH },
  { code: 'ichalkaranji', name: 'Ichalkaranji', state: MH },
  // Maharashtra — hill stations, beaches and pilgrimage towns
  { code: 'lonavala', name: 'Lonavala', state: MH, aliases: 'Khandala' },
  { code: 'mahabaleshwar', name: 'Mahabaleshwar', state: MH },
  { code: 'panchgani', name: 'Panchgani', state: MH },
  { code: 'matheran', name: 'Matheran', state: MH },
  { code: 'igatpuri', name: 'Igatpuri', state: MH },
  { code: 'alibaug', name: 'Alibaug', state: MH, aliases: 'Alibag' },
  { code: 'ganpatipule', name: 'Ganpatipule', state: MH },
  { code: 'malvan', name: 'Malvan', state: MH, aliases: 'Tarkarli' },
  { code: 'shirdi', name: 'Shirdi', state: MH, aliases: 'Sai Baba' },
  { code: 'pandharpur', name: 'Pandharpur', state: MH, aliases: 'Vitthal' },
  { code: 'trimbakeshwar', name: 'Trimbakeshwar', state: MH },
  { code: 'shegaon', name: 'Shegaon', state: MH },
  { code: 'lavasa', name: 'Lavasa', state: MH },
  // Across India
  { code: 'delhi', name: 'New Delhi', state: 'Delhi' },
  { code: 'bengaluru', name: 'Bengaluru', state: 'Karnataka', aliases: 'Bangalore' },
  { code: 'hyderabad', name: 'Hyderabad', state: 'Telangana' },
  { code: 'goa', name: 'Goa', state: 'Goa', aliases: 'Panaji Panjim Margao' },
  { code: 'ahmedabad', name: 'Ahmedabad', state: 'Gujarat' },
  { code: 'surat', name: 'Surat', state: 'Gujarat' },
  { code: 'vadodara', name: 'Vadodara', state: 'Gujarat', aliases: 'Baroda' },
  { code: 'rajkot', name: 'Rajkot', state: 'Gujarat' },
  { code: 'indore', name: 'Indore', state: 'Madhya Pradesh' },
  { code: 'bhopal', name: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'hubballi', name: 'Hubballi', state: 'Karnataka', aliases: 'Hubli Dharwad' },
  { code: 'belagavi', name: 'Belagavi', state: 'Karnataka', aliases: 'Belgaum' },
  { code: 'mangaluru', name: 'Mangaluru', state: 'Karnataka', aliases: 'Mangalore' },
  { code: 'mysuru', name: 'Mysuru', state: 'Karnataka', aliases: 'Mysore' },
  { code: 'hampi', name: 'Hampi', state: 'Karnataka' },
  { code: 'chennai', name: 'Chennai', state: 'Tamil Nadu', aliases: 'Madras' },
  { code: 'coimbatore', name: 'Coimbatore', state: 'Tamil Nadu' },
  { code: 'madurai', name: 'Madurai', state: 'Tamil Nadu' },
  { code: 'ooty', name: 'Ooty', state: 'Tamil Nadu', aliases: 'Udhagamandalam' },
  { code: 'kochi', name: 'Kochi', state: 'Kerala', aliases: 'Cochin Ernakulam' },
  { code: 'munnar', name: 'Munnar', state: 'Kerala' },
  { code: 'alleppey', name: 'Alappuzha', state: 'Kerala', aliases: 'Alleppey' },
  { code: 'visakhapatnam', name: 'Visakhapatnam', state: 'Andhra Pradesh', aliases: 'Vizag' },
  { code: 'vijayawada', name: 'Vijayawada', state: 'Andhra Pradesh' },
  { code: 'tirupati', name: 'Tirupati', state: 'Andhra Pradesh' },
  { code: 'jaipur', name: 'Jaipur', state: 'Rajasthan' },
  { code: 'udaipur', name: 'Udaipur', state: 'Rajasthan' },
  { code: 'jodhpur', name: 'Jodhpur', state: 'Rajasthan' },
  { code: 'agra', name: 'Agra', state: 'Uttar Pradesh' },
  { code: 'lucknow', name: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'varanasi', name: 'Varanasi', state: 'Uttar Pradesh', aliases: 'Banaras Kashi' },
  { code: 'patna', name: 'Patna', state: 'Bihar' },
  { code: 'ranchi', name: 'Ranchi', state: 'Jharkhand' },
  { code: 'raipur', name: 'Raipur', state: 'Chhattisgarh' },
  { code: 'bhubaneswar', name: 'Bhubaneswar', state: 'Odisha' },
  { code: 'kolkata', name: 'Kolkata', state: 'West Bengal', aliases: 'Calcutta' },
  { code: 'darjeeling', name: 'Darjeeling', state: 'West Bengal' },
  { code: 'guwahati', name: 'Guwahati', state: 'Assam' },
  { code: 'chandigarh', name: 'Chandigarh', state: 'Chandigarh' },
  { code: 'amritsar', name: 'Amritsar', state: 'Punjab' },
  { code: 'dehradun', name: 'Dehradun', state: 'Uttarakhand' },
  { code: 'rishikesh', name: 'Rishikesh', state: 'Uttarakhand' },
  { code: 'haridwar', name: 'Haridwar', state: 'Uttarakhand' },
  { code: 'shimla', name: 'Shimla', state: 'Himachal Pradesh' },
  { code: 'manali', name: 'Manali', state: 'Himachal Pradesh' },
  { code: 'dharamshala', name: 'Dharamshala', state: 'Himachal Pradesh', aliases: 'McLeod Ganj' },
  { code: 'srinagar', name: 'Srinagar', state: 'Jammu and Kashmir' },
];

// ───────────────────────────── Train stations ─────────────────────────────

export interface TrainStation {
  /** Indian Railways station code */
  code: string;
  name: string;
  city: string;
  state: string;
}

export const TRAIN_STATIONS: readonly TrainStation[] = [
  // Maharashtra
  { code: 'PUNE', name: 'Pune Junction', city: 'Pune', state: MH },
  { code: 'CSMT', name: 'Mumbai CSMT', city: 'Mumbai', state: MH },
  { code: 'LTT', name: 'Lokmanya Tilak Terminus', city: 'Mumbai', state: MH },
  { code: 'MMCT', name: 'Mumbai Central', city: 'Mumbai', state: MH },
  { code: 'DR', name: 'Dadar', city: 'Mumbai', state: MH },
  { code: 'BDTS', name: 'Bandra Terminus', city: 'Mumbai', state: MH },
  { code: 'TNA', name: 'Thane', city: 'Thane', state: MH },
  { code: 'KYN', name: 'Kalyan Junction', city: 'Kalyan', state: MH },
  { code: 'PNVL', name: 'Panvel', city: 'Navi Mumbai', state: MH },
  { code: 'LNL', name: 'Lonavala', city: 'Lonavala', state: MH },
  { code: 'DD', name: 'Daund Junction', city: 'Daund', state: MH },
  { code: 'NK', name: 'Nasik Road', city: 'Nashik', state: MH },
  { code: 'IGP', name: 'Igatpuri', city: 'Igatpuri', state: MH },
  { code: 'MMR', name: 'Manmad Junction', city: 'Manmad', state: MH },
  { code: 'NGP', name: 'Nagpur Junction', city: 'Nagpur', state: MH },
  {
    code: 'AWB',
    name: 'Chhatrapati Sambhajinagar',
    city: 'Chhatrapati Sambhajinagar (Aurangabad)',
    state: MH,
  },
  { code: 'KOP', name: 'Kolhapur Chhatrapati Shahu Maharaj Terminus', city: 'Kolhapur', state: MH },
  { code: 'SUR', name: 'Solapur', city: 'Solapur', state: MH },
  { code: 'MRJ', name: 'Miraj Junction', city: 'Sangli', state: MH },
  { code: 'STR', name: 'Satara', city: 'Satara', state: MH },
  { code: 'KRD', name: 'Karad', city: 'Karad', state: MH },
  { code: 'ANG', name: 'Ahilyanagar', city: 'Ahilyanagar (Ahmednagar)', state: MH },
  { code: 'SNSI', name: 'Sainagar Shirdi', city: 'Shirdi', state: MH },
  { code: 'PVR', name: 'Pandharpur', city: 'Pandharpur', state: MH },
  { code: 'BSL', name: 'Bhusaval Junction', city: 'Bhusaval', state: MH },
  { code: 'JL', name: 'Jalgaon Junction', city: 'Jalgaon', state: MH },
  { code: 'AK', name: 'Akola Junction', city: 'Akola', state: MH },
  { code: 'BD', name: 'Badnera Junction', city: 'Amravati', state: MH },
  { code: 'WR', name: 'Wardha Junction', city: 'Wardha', state: MH },
  { code: 'CD', name: 'Chandrapur', city: 'Chandrapur', state: MH },
  { code: 'G', name: 'Gondia Junction', city: 'Gondia', state: MH },
  { code: 'NED', name: 'Hazur Sahib Nanded', city: 'Nanded', state: MH },
  { code: 'LUR', name: 'Latur', city: 'Latur', state: MH },
  { code: 'PBN', name: 'Parbhani Junction', city: 'Parbhani', state: MH },
  { code: 'J', name: 'Jalna', city: 'Jalna', state: MH },
  { code: 'RN', name: 'Ratnagiri', city: 'Ratnagiri', state: MH },
  { code: 'KUDL', name: 'Kudal', city: 'Sindhudurg', state: MH },
  { code: 'SWV', name: 'Sawantwadi Road', city: 'Sawantwadi', state: MH },
  // Across India
  { code: 'NDLS', name: 'New Delhi', city: 'New Delhi', state: 'Delhi' },
  { code: 'NZM', name: 'Hazrat Nizamuddin', city: 'New Delhi', state: 'Delhi' },
  { code: 'SBC', name: 'KSR Bengaluru', city: 'Bengaluru', state: 'Karnataka' },
  { code: 'UBL', name: 'Hubballi Junction', city: 'Hubballi', state: 'Karnataka' },
  { code: 'MYS', name: 'Mysuru Junction', city: 'Mysuru', state: 'Karnataka' },
  { code: 'MAQ', name: 'Mangaluru Central', city: 'Mangaluru', state: 'Karnataka' },
  { code: 'SC', name: 'Secunderabad Junction', city: 'Hyderabad', state: 'Telangana' },
  { code: 'MAS', name: 'Chennai Central', city: 'Chennai', state: 'Tamil Nadu' },
  { code: 'CBE', name: 'Coimbatore Junction', city: 'Coimbatore', state: 'Tamil Nadu' },
  { code: 'MDU', name: 'Madurai Junction', city: 'Madurai', state: 'Tamil Nadu' },
  { code: 'MAO', name: 'Madgaon Junction', city: 'Goa', state: 'Goa' },
  { code: 'ADI', name: 'Ahmedabad Junction', city: 'Ahmedabad', state: 'Gujarat' },
  { code: 'ST', name: 'Surat', city: 'Surat', state: 'Gujarat' },
  { code: 'BRC', name: 'Vadodara Junction', city: 'Vadodara', state: 'Gujarat' },
  { code: 'INDB', name: 'Indore Junction', city: 'Indore', state: 'Madhya Pradesh' },
  { code: 'BPL', name: 'Bhopal Junction', city: 'Bhopal', state: 'Madhya Pradesh' },
  { code: 'JP', name: 'Jaipur Junction', city: 'Jaipur', state: 'Rajasthan' },
  { code: 'JU', name: 'Jodhpur Junction', city: 'Jodhpur', state: 'Rajasthan' },
  { code: 'UDZ', name: 'Udaipur City', city: 'Udaipur', state: 'Rajasthan' },
  { code: 'ERS', name: 'Ernakulam Junction', city: 'Kochi', state: 'Kerala' },
  { code: 'TVC', name: 'Thiruvananthapuram Central', city: 'Thiruvananthapuram', state: 'Kerala' },
  { code: 'VSKP', name: 'Visakhapatnam', city: 'Visakhapatnam', state: 'Andhra Pradesh' },
  { code: 'BZA', name: 'Vijayawada Junction', city: 'Vijayawada', state: 'Andhra Pradesh' },
  { code: 'TPTY', name: 'Tirupati', city: 'Tirupati', state: 'Andhra Pradesh' },
  { code: 'AGC', name: 'Agra Cantt', city: 'Agra', state: 'Uttar Pradesh' },
  { code: 'LKO', name: 'Lucknow Charbagh', city: 'Lucknow', state: 'Uttar Pradesh' },
  { code: 'CNB', name: 'Kanpur Central', city: 'Kanpur', state: 'Uttar Pradesh' },
  { code: 'BSB', name: 'Varanasi Junction', city: 'Varanasi', state: 'Uttar Pradesh' },
  { code: 'PNBE', name: 'Patna Junction', city: 'Patna', state: 'Bihar' },
  { code: 'R', name: 'Raipur Junction', city: 'Raipur', state: 'Chhattisgarh' },
  { code: 'BBS', name: 'Bhubaneswar', city: 'Bhubaneswar', state: 'Odisha' },
  { code: 'HWH', name: 'Howrah Junction', city: 'Kolkata', state: 'West Bengal' },
  { code: 'GHY', name: 'Guwahati', city: 'Guwahati', state: 'Assam' },
  { code: 'CDG', name: 'Chandigarh', city: 'Chandigarh', state: 'Chandigarh' },
  { code: 'ASR', name: 'Amritsar Junction', city: 'Amritsar', state: 'Punjab' },
  { code: 'HW', name: 'Haridwar Junction', city: 'Haridwar', state: 'Uttarakhand' },
  { code: 'DDN', name: 'Dehradun', city: 'Dehradun', state: 'Uttarakhand' },
  { code: 'JAT', name: 'Jammu Tawi', city: 'Jammu', state: 'Jammu and Kashmir' },
];

export function findAirport(code: string): Airport | undefined {
  return AIRPORTS.find((a) => a.code === code);
}

export function findCity(code: string): City | undefined {
  return CITIES.find((c) => c.code === code);
}

export function findStation(code: string): TrainStation | undefined {
  return TRAIN_STATIONS.find((s) => s.code === code);
}
