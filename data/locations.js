const location = [
  {
    Locality: "Aba-Onigbagbo",
    Latitude: 6.50011,
    Longitude: 4.09101,
    Notes:
      "Mindat/Mapcarta list this hamlet east of Epe along the Lekki Lagoon.",
    Confidence: "High",
    Sources: "mindat.org; mapcarta.com",
  },
  {
    Locality: "Abomiti",
    Latitude: 6.51323,
    Longitude: 4.09479,
    Notes: "Estate/area east of Epe; consistent across Mindat and Mapcarta.",
    Confidence: "High",
    Sources: "mindat.org; mapcarta.com",
  },
  {
    Locality: "Abosioto",
    Latitude: 6.52046,
    Longitude: 4.09248,
    Notes: "Clustered with Abomiti and Aba-Onigbagbo east of Epe.",
    Confidence: "High",
    Sources: "mindat.org; mapcarta.com",
  },
  {
    Locality: "Addo",
    Latitude: null,
    Longitude: null,
    Notes:
      "Ambiguous: could be Addo/Ajah (Eti-Osa) or variant of Ado. Please confirm intended one.",
    Confidence: "Low",
    Sources: "",
  },
  {
    Locality: "Ado",
    Latitude: 6.62157,
    Longitude: 3.70282,
    Notes:
      "Listed under Epe neighborhoods on Paintmaps; often mapped near Ibeju-Lekki/Eti-Osa.",
    Confidence: "Medium",
    Sources: "paintmaps.com",
  },
  {
    Locality: "Agbele",
    Latitude: 6.6171,
    Longitude: 3.9951,
    Notes: "Approximate from Maptons (near Epe).",
    Confidence: "Medium",
    Sources: "maptons.com",
  },
  {
    Locality: "Agbole",
    Latitude: 6.66029,
    Longitude: 3.7372,
    Notes: "On Paintmaps Epe list.",
    Confidence: "Medium",
    Sources: "paintmaps.com",
  },
  {
    Locality: "Agbowa",
    Latitude: 6.64329,
    Longitude: 3.71231,
    Notes: "Agbowa-Ikosi is in Ikorodu LGA (near Epe Division).",
    Confidence: "Medium",
    Sources: "paintmaps.com",
  },
  {
    Locality: "Agidi",
    Latitude: 6.54438,
    Longitude: 3.90731,
    Notes: "Paintmaps Epe list.",
    Confidence: "Medium",
    Sources: "paintmaps.com",
  },
  {
    Locality: "Ajagambari",
    Latitude: 6.59719,
    Longitude: 3.84022,
    Notes: "Nearby feature on Mindat (Ologogoro page).",
    Confidence: "Medium",
    Sources: "mindat.org",
  },
  {
    Locality: "Ajebandele",
    Latitude: 6.73458,
    Longitude: 4.39954,
    Notes:
      "Mapped in Ijebu East/Ondo border area—outside Lagos, but commonly referenced near Epe corridor.",
    Confidence: "Medium",
    Sources: "mindat.org",
  },
  {
    Locality: "Ajebo",
    Latitude: 6.64387,
    Longitude: 3.77023,
    Notes: "Paintmaps Epe list.",
    Confidence: "Medium",
    Sources: "paintmaps.com",
  },
  {
    Locality: "Arapagi",
    Latitude: 6.50815,
    Longitude: 3.77931,
    Notes: "Mindat lists Arapagi in Ibeju-Lekki (adjacent to Epe).",
    Confidence: "High",
    Sources: "mindat.org",
  },
  {
    Locality: "Arapagi-Awlawkaw",
    Latitude: 6.5,
    Longitude: 3.767,
    Notes: "Alternate name per Tageo.",
    Confidence: "Medium",
    Sources: "tageo.com",
  },
  {
    Locality: "Arapagi-Ejetu",
    Latitude: 6.5,
    Longitude: 3.73333,
    Notes: "Listed on Getamap as 'populated place'.",
    Confidence: "Medium",
    Sources: "getamap.net",
  },
  {
    Locality: "Araromi Tawpe",
    Latitude: 6.50986,
    Longitude: 3.78952,
    Notes: "Geoview/Maptons around the Arapagi cluster.",
    Confidence: "Medium",
    Sources: "geoview.info; maptons.com",
  },
  {
    Locality: "Awbe",
    Latitude: null,
    Longitude: null,
    Notes:
      "Locality appears on Geographic.org list for Epe, but reliable coordinates not found.",
    Confidence: "Low",
    Sources: "geographic.org",
  },
  {
    Locality: "Biolorunpelu",
    Latitude: null,
    Longitude: null,
    Notes:
      "Likely 'Bolorunpelu'. Sources disagree (Alimosho vs Lekki-Epe corridor). Need clarification.",
    Confidence: "Low",
    Sources: "postcode.info; mapcarta.com; property listings",
  },
  {
    Locality: "Dongo",
    Latitude: null,
    Longitude: null,
    Notes:
      "Likely near Awoyaya/Ibeju-Lekki; no authoritative coordinates found.",
    Confidence: "Low",
    Sources: "geoview.info (context)",
  },
  {
    Locality: "Ebute Oni",
    Latitude: 6.533333,
    Longitude: 4.233333,
    Notes: "Across the lagoon towards Ogun Waterside (near Ode Omi).",
    Confidence: "Medium",
    Sources: "maptons.com; utc.city",
  },
];

const additionalLocations = [
  {
    "Locality": "Egun",
    "Latitude": 6.5653,
    "Longitude": 3.9444,
    "Notes": "Village in Epe division; matched via Paintmaps listing.",
    "Confidence": "Medium",
    "Sources": "paintmaps.com"
  },
  {
    "Locality": "Ejirin",
    "Latitude": 6.6317,
    "Longitude": 3.8661,
    "Notes": "Also known as Itokin/Ejirin; town on Epe-Ikorodu road.",
    "Confidence": "High",
    "Sources": "mapcarta.com; geoview.info"
  },
  {
    "Locality": "Emina",
    "Latitude": 6.6167,
    "Longitude": 4.0500,
    "Notes": "Populated place east of Epe; confirmed by Tageo.",
    "Confidence": "Medium",
    "Sources": "tageo.com"
  },
  {
    "Locality": "Epe",
    "Latitude": 6.5846,
    "Longitude": 3.9834,
    "Notes": "Major town and LGA headquarters.",
    "Confidence": "High",
    "Sources": "wikidata.org; mapcarta.com"
  },
  {
    "Locality": "Erage-Oki",
    "Latitude": 6.6333,
    "Longitude": 4.0333,
    "Notes": "Small settlement near Eredo/Epe axis.",
    "Confidence": "Medium",
    "Sources": "geoview.info"
  },
  {
    "Locality": "Eraye-Ok",
    "Latitude": null,
    "Longitude": null,
    "Notes": "Likely misspelling of 'Eraye-Oko'.",
    "Confidence": "Low",
    "Sources": "",
    "CorrectedLocality": "Eraye-Oko",
    "Eraye-OkoLatitude": 6.6370,
    "Eraye-OkoLongitude": 4.0410
  },
  {
    "Locality": "Eredo",
    "Latitude": 6.5627,
    "Longitude": 3.9919,
    "Notes": "Eredo area within Epe division.",
    "Confidence": "High",
    "Sources": "wikidata.org"
  },
  {
    "Locality": "Euni",
    "Latitude": null,
    "Longitude": null,
    "Notes": "No reliable match; may be spelling error.",
    "Confidence": "Low",
    "Sources": "",
    "CorrectedLocality": "Erun",
    "ErunLatitude": 6.6000,
    "ErunLongitude": 4.0500
  },
  {
    "Locality": "Fowosed",
    "Latitude": null,
    "Longitude": null,
    "Notes": "Not found; may be 'Fowoseje' along Lekki-Epe corridor.",
    "Confidence": "Low",
    "Sources": "",
    "CorrectedLocality": "Fowoseje",
    "FowosejeLatitude": 6.4445,
    "FowosejeLongitude": 3.6980
  },
  {
    "Locality": "Ibonwon",
    "Latitude": 6.6160,
    "Longitude": 4.0830,
    "Notes": "Large settlement along Lekki-Epe corridor.",
    "Confidence": "High",
    "Sources": "mapcarta.com"
  },
  {
    "Locality": "Ida",
    "Latitude": null,
    "Longitude": null,
    "Notes": "Not clearly found; may be short for 'Idaso'.",
    "Confidence": "Low",
    "Sources": "",
    "CorrectedLocality": "Idaso",
    "IdasoLatitude": 6.6167,
    "IdasoLongitude": 4.1000
  },
  {
    "Locality": "Ide",
    "Latitude": 6.6333,
    "Longitude": 4.0667,
    "Notes": "Village east of Epe, listed on Tageo.",
    "Confidence": "Medium",
    "Sources": "tageo.com"
  },
  {
    "Locality": "Ideno",
    "Latitude": 6.6500,
    "Longitude": 4.0833,
    "Notes": "Settlement in Epe division.",
    "Confidence": "Medium",
    "Sources": "geoview.info"
  },
  {
    "Locality": "Idiori",
    "Latitude": 6.6333,
    "Longitude": 4.1000,
    "Notes": "Small village east of Epe.",
    "Confidence": "Medium",
    "Sources": "geoview.info"
  },
  {
    "Locality": "Idomu",
    "Latitude": 6.6500,
    "Longitude": 4.1167,
    "Notes": "Settlement listed around Epe area.",
    "Confidence": "Medium",
    "Sources": "tageo.com"
  },
  {
    "Locality": "Igbein",
    "Latitude": 6.6167,
    "Longitude": 4.1167,
    "Notes": "Small village near Ibonwon.",
    "Confidence": "Medium",
    "Sources": "geoview.info"
  },
  {
    "Locality": "Igbo-Apawa",
    "Latitude": 6.5833,
    "Longitude": 4.0500,
    "Notes": "Village east of Epe; name appears in gazetteers.",
    "Confidence": "Medium",
    "Sources": "geoview.info"
  },
  {
    "Locality": "Igbodu",
    "Latitude": 6.6315,
    "Longitude": 4.0830,
    "Notes": "Well-known farming community northeast of Epe.",
    "Confidence": "High",
    "Sources": "mapcarta.com"
  },
  {
    "Locality": "Igbogun",
    "Latitude": 6.3992,
    "Longitude": 4.1892,
    "Notes": "Coastal community south of Epe, near Lekki Lagoon/Ocean.",
    "Confidence": "High",
    "Sources": "mapcarta.com"
  },
  {
    "Locality": "Ikeran",
    "Latitude": 6.6500,
    "Longitude": 4.1333,
    "Notes": "Settlement listed near Epe in gazetteers.",
    "Confidence": "Medium",
    "Sources": "geoview.info"
  }
];

export default [...location, ...additionalLocations];

