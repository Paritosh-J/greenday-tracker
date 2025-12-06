import axios from "axios";
import dotenv from "dotenv";

// load .env file
dotenv.config();

const TM_KEY = process.env.TICKETMASTER_API_KEY;
if (!TM_KEY)
  console.warn(
    "⚠️ WARNING: TICKETMASTER_API_KEY not set Ticketmaster queries will fail."
  );

const BASE_URL = process.env.TICKETMASTER_BASE_URL;
const ARTIST_KEYWORD = process.env.ARTIST_KEYWORD;
const COUNTRY_CODE = process.env.COUNTRY_CODE;

export async function fetchEventsByKeywordAndCountry(
  keyword = ARTIST_KEYWORD,
  countryCode = COUNTRY_CODE
) {
  const url = `${BASE_URL}/events.json`;

  try {
    const res = await axios.get(url, {
      params: {
        keyword: keyword,
        countryCode: countryCode,
        apikey: TM_KEY,
        sort: "date,asc",
        size: 50,
      },
      timeout: 10000,
    });

    // ticketmaster puts events under _embedded.events
    const events = res.data?._embedded?.events ?? [];

    // map to normalized items of interest
    return events.map((e) => {
      const venue = e._embedded?.venues?.[0] ?? {};

      return {
        id: e.id,
        name: e.name,
        url: e.url,
        date: e.dates?.start?.dateTime ?? e.dates?.start?.localDate,
        timezone: e.dates?.timezone,
        venue: {
          name: venue.name,
          city: venue.city?.name,
          country: venue.country?.countryCode,
          address: venue.address?.line1,
        },
        raw: e,
      };
    });
  } catch (e) {
    console.error(
      "❌ Ticketmaster fetch error",
      e?.response?.data ?? e.message
    );
    throw new Error("Ticketmaster fetch failed");
  }
}
