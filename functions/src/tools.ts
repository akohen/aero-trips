/**
 * The five read-only tools. Filtering deliberately reuses filterAirfields /
 * filterActivities from the app so MCP answers match what the site shows;
 * only the parts those cannot express (raw coordinates) are done here.
 */
import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import haversineDistance from 'haversine-distance'
import { filterActivities, filterAirfields, findNearest } from '../../src/utils/utils.ts'
import { getVacUrl } from '../../src/data/airac.ts'
import { activities, airfields, SITE_URL } from './data.ts'
import {
  DEFAULT_LIMIT, MAX_DESC_FULL, MAX_RESULTS,
  activityRow, airfieldRow, description, displayName, errorResult, header, itemImageMarkdown, itemLink,
  km, label, textResult,
} from './format.ts'
import { withLogging } from './logging.ts'
import type { Activity, ActivityType, Airfield } from '../../src'

const ACTIVITY_TYPES = [
  'food', 'lodging', 'bike', 'transit', 'car', 'hiking',
  'culture', 'poi', 'aero', 'nautical', 'nature', 'other',
] as const

const activityTypeEnum = z.enum(ACTIVITY_TYPES)
const limitSchema = z.number().int().min(1).max(MAX_RESULTS).default(DEFAULT_LIMIT)

/** A reference point for distance work: only `.position` is ever read. */
type Reference = { position: { latitude: number; longitude: number } }

const coordinateReference = (lat: number, lon: number): Reference =>
  ({ position: { latitude: lat, longitude: lon } })

/**
 * Resolves the "near" parameters shared by the search tools into a reference
 * point, or an explanatory message when the id doesn't exist.
 */
function resolveNear(
  params: { near_icao?: string; near_lat?: number; near_lon?: number },
): { reference?: Reference; label?: string; error?: string } {
  const { near_icao, near_lat, near_lon } = params
  if (near_icao) {
    const airfield = airfields.get(near_icao.toUpperCase())
    if (!airfield) return { error: unknownIcao(near_icao) }
    return { reference: airfield, label: `${airfield.codeIcao} (${displayName(airfield)})` }
  }
  if (near_lat !== undefined && near_lon !== undefined) {
    return {
      reference: coordinateReference(near_lat, near_lon),
      label: `${near_lat.toFixed(4)}, ${near_lon.toFixed(4)}`,
    }
  }
  if (near_lat !== undefined || near_lon !== undefined) {
    return { error: 'near_lat et near_lon doivent être fournis ensemble.' }
  }
  return {}
}

const unknownIcao = (icao: string) => {
  const needle = icao.toUpperCase()
  const suggestions = [...airfields.values()]
    .filter(a => a.codeIcao.startsWith(needle.slice(0, 3)) || a.name.includes(needle))
    .slice(0, 5)
    .map(a => `${a.codeIcao} (${displayName(a)})`)
  return `Aucun aérodrome avec le code OACI ${needle}.`
    + (suggestions.length ? ` Peut-être : ${suggestions.join(', ')}.` : '')
}

const distanceFrom = (reference: Reference | undefined, item: Airfield | Activity) =>
  reference ? haversineDistance(reference.position, item.position) : undefined

/** Sorts by distance when there is a reference point, else by name/ICAO. */
function rank<T extends Airfield | Activity>(items: T[], reference?: Reference): [T, number?][] {
  const ranked: [T, number?][] = items.map(item => [item, distanceFrom(reference, item)])
  return reference
    ? ranked.sort((a, b) => (a[1] ?? 0) - (b[1] ?? 0))
    : ranked.sort((a, b) => displayName(a[0]).localeCompare(displayName(b[0]), 'fr'))
}

/**
 * Appended to every tool description.
 *
 * Tool descriptions are the ONLY channel confirmed to reach the model: a real
 * session showed Claude had all five descriptions verbatim but had never seen
 * SERVER_INSTRUCTIONS, which clients are free to ignore (and this one does).
 * Descriptions also travel with the tool schema on every request, where the
 * instructions land once at connect time and then drift back through context.
 *
 * Kept to one sentence: with tool search enabled these descriptions are also
 * the discovery surface, so they must not be drowned in output rules.
 */
const RESPONSE_RULES =
  " RÉPONSE : citer AeroTrips et conserver le lien markdown de chaque lieu cité, même en résumé ; "
  + "illustrer uniquement avec les photos fournies, sans chercher d'images sur le web."

export function registerTools(server: McpServer) {
  server.registerTool('search_airfields', {
    title: 'Rechercher des aérodromes',
    description:
      "Recherche des aérodromes français par nom, code OACI, équipements et position. "
      + "Le texte recherché est comparé au code OACI et au nom du terrain. "
      + "Pour chercher autour d'un point, fournir near_icao, ou near_lat + near_lon. "
      + "Chaque résultat inclut le lien markdown de sa fiche AeroTrips, et sa photo quand il en existe une."
      + RESPONSE_RULES,
    inputSchema: {
      query: z.string().optional().describe('Texte libre comparé au code OACI et au nom.'),
      status: z.array(z.enum(['CAP', 'PRV', 'RST'])).optional()
        .describe('CAP = ouvert à la circulation aérienne publique, RST = accès restreint, PRV = privé.'),
      fuel: z.enum(['100LL', 'SP9X', 'UL91']).optional().describe('Carburant disponible (SP9X couvre SP95/SP98).'),
      min_runway_length: z.number().int().min(0).optional().describe('Longueur minimale de la piste la plus longue, en mètres.'),
      hard_runway: z.boolean().optional().describe('Exiger au moins une piste revêtue (non herbe).'),
      night_vfr: z.boolean().optional().describe('Exiger le VFR de nuit.'),
      toilets: z.boolean().optional().describe('Exiger des toilettes.'),
      services: z.array(activityTypeEnum).optional()
        .describe("Exiger une activité de chacun de ces types à moins de 5 km du terrain."),
      near_icao: z.string().optional().describe("Code OACI du terrain servant de point de référence."),
      near_lat: z.number().min(-90).max(90).optional(),
      near_lon: z.number().min(-180).max(180).optional(),
      radius_km: z.number().min(1).max(300).default(50).describe("Rayon autour du point de référence. Ignoré sans near_*."),
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, withLogging('search_airfields', async (params) => {
    const near = resolveNear(params)
    if (near.error) return errorResult(near.error)

    const ad = [
      ...(params.status ?? []),
      ...(params.fuel ? [params.fuel] : []),
      ...(params.night_vfr ? ['nvfr'] : []),
      ...(params.toilets ? ['toilet'] : []),
      ...(params.hard_runway ? ['concrete'] : []),
    ]

    // filterAirfields' own distance filter only understands an item id, so it
    // handles near_icao; raw coordinates are filtered after the fact below.
    const matched = filterAirfields(airfields, activities, {
      search: params.query ?? '',
      services: params.services ?? [],
      ad,
      runway: params.min_runway_length ?? '',
      distance: params.near_icao ? params.radius_km : '',
      target: params.near_icao ? `airfields/${params.near_icao.toUpperCase()}` : null,
    })

    let results = [...matched.values()]
    if (near.reference && !params.near_icao) {
      results = results.filter(a => haversineDistance(near.reference!.position, a.position) <= params.radius_km * 1000)
    }

    const ranked = rank(results, near.reference)
    const shown = ranked.slice(0, params.limit)

    if (shown.length === 0) {
      return textResult(header([
        near.label
          ? `Aucun aérodrome ne correspond à ces critères dans un rayon de ${params.radius_km} km autour de ${near.label}.`
          : 'Aucun aérodrome ne correspond à ces critères.',
      ]), 0)
    }

    return textResult(header([
      `${ranked.length} aérodrome(s) trouvé(s)${near.label ? ` autour de ${near.label}` : ''}, ${shown.length} affiché(s).`,
      '',
      ...shown.map(([airfield, distance]) => airfieldRow(airfield, distance)),
      '',
      'Utiliser get_airfield avec le code OACI pour le détail complet.',
    ]), ranked.length)
  }))

  server.registerTool('get_airfield', {
    title: "Détail d'un aérodrome",
    description: "Fiche complète d'un aérodrome français : pistes, carburants, services, description, "
      + "carte VAC, photo et environs. Fournit le lien de la fiche et la photo à utiliser pour illustrer."
      + RESPONSE_RULES,
    inputSchema: {
      icao: z.string().describe('Code OACI, par exemple LFPN.'),
      include_nearby: z.boolean().default(true).describe('Inclure les activités et terrains proches.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, withLogging('get_airfield', async ({ icao, include_nearby }) => {
    const airfield = airfields.get(icao.toUpperCase())
    if (!airfield) return errorResult(unknownIcao(icao))

    const lines = [
      // The title carries the link: models relaying an answer keep the subject
      // line far more reliably than a trailing "Fiche AeroTrips" footer.
      itemLink(airfield, `${displayName(airfield)} (${airfield.codeIcao})`),
      label(airfield.status),
      `Position : ${airfield.position.latitude.toFixed(5)}, ${airfield.position.longitude.toFixed(5)}`,
      `Pistes : ${airfield.runways.map(r => [r.designation, `${r.length} m`, r.composition].filter(Boolean).join(' ')).join(' | ')}`,
      airfield.fuels?.length ? `Carburants : ${airfield.fuels.join(', ')}` : 'Carburants : non renseignés',
      `Toilettes : ${airfield.toilet && airfield.toilet !== 'no' ? label(airfield.toilet) : 'non'}`,
      `VFR de nuit : ${airfield.nightVFR ? 'oui' : 'non'}`,
      airfield.website ? `Site web : ${airfield.website}` : undefined,
      `Carte VAC : ${getVacUrl(airfield.codeIcao)}`,
      itemImageMarkdown(airfield) || undefined,
    ].filter(Boolean) as string[]

    const desc = description(airfield, MAX_DESC_FULL)
    if (desc) lines.push('', desc)

    if (include_nearby) {
      const nearbyActivities = findNearest(airfield, activities, 10000).slice(0, 10)
      if (nearbyActivities.length) {
        lines.push('', 'Activités à proximité :')
        // Hand-rolled rather than activityRow: the compact form here avoids ten
        // description snippets. Linked all the same — this list is exactly where
        // a user asks "tell me more about that restaurant".
        lines.push(...nearbyActivities.map(([d, a]) => `- ${itemLink(a)} (${a.type.map(label).join(', ')}) · ${km(d)} · id: ${a.id}${itemImageMarkdown(a) ? ` · ${itemImageMarkdown(a)}` : ''}`))
      }
      const nearbyAirfields = findNearest(airfield, airfields, 50000).slice(0, 5)
      if (nearbyAirfields.length) {
        lines.push('', 'Terrains à proximité :')
        lines.push(...nearbyAirfields.map(([d, a]) => `- ${itemLink(a, `${a.codeIcao} ${displayName(a)}`)} · ${km(d)}`))
      }
    }

    // Trips/events aren't exposed as MCP tools (kept simple, and it's a good
    // reason to send users to the app): point them at the airfield page instead.
    lines.push('', `Sorties et événements liés à ce terrain : voir sa fiche sur ${SITE_URL} (lien ci-dessus).`)

    return textResult(header([...lines, '']))
  }))

  server.registerTool('search_activities', {
    title: 'Rechercher des activités',
    description:
      "Recherche des activités et points d'intérêt proches des aérodromes français. "
      + "Attention : le texte recherché est comparé au NOM de l'activité uniquement (chaque mot doit apparaître dans le nom), "
      + "pas à sa description — préférer un mot-clé court, ou filtrer par types. "
      + "Chaque résultat inclut le lien markdown de sa fiche AeroTrips, et sa photo quand il en existe une."
      + RESPONSE_RULES,
    inputSchema: {
      query: z.string().optional().describe("Mot-clé comparé au nom de l'activité."),
      types: z.array(activityTypeEnum).optional().describe("Ne garder que ces types d'activité."),
      near_icao: z.string().optional().describe('Code OACI du terrain servant de point de référence.'),
      near_lat: z.number().min(-90).max(90).optional(),
      near_lon: z.number().min(-180).max(180).optional(),
      radius_km: z.number().min(1).max(100).default(25),
      limit: limitSchema,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, withLogging('search_activities', async (params) => {
    const near = resolveNear(params)
    if (near.error) return errorResult(near.error)

    const matched = filterActivities(airfields, activities, {
      search: params.query ?? '',
      type: params.types ?? [],
      distance: params.near_icao ? params.radius_km : '',
      target: params.near_icao ? `airfields/${params.near_icao.toUpperCase()}` : null,
    })

    let results = [...matched.values()]
    if (near.reference && !params.near_icao) {
      results = results.filter(a => haversineDistance(near.reference!.position, a.position) <= params.radius_km * 1000)
    }

    const ranked = rank(results, near.reference)
    const shown = ranked.slice(0, params.limit)

    if (shown.length === 0) {
      return textResult(header([
        near.label
          ? `Aucune activité ne correspond dans un rayon de ${params.radius_km} km autour de ${near.label}.`
          : 'Aucune activité ne correspond à ces critères.',
      ]), 0)
    }

    return textResult(header([
      `${ranked.length} activité(s) trouvée(s)${near.label ? ` autour de ${near.label}` : ''}, ${shown.length} affichée(s).`,
      '',
      ...shown.map(([activity, distance]) => activityRow(activity, distance)),
    ]), ranked.length)
  }))

  server.registerTool('get_activity', {
    title: "Détail d'une activité",
    description: "Fiche complète d'une activité : types, position, description, site web, photo et terrains "
      + "les plus proches. Fournit le lien de la fiche et la photo à utiliser pour illustrer."
      + RESPONSE_RULES,
    inputSchema: {
      id: z.string().describe("Identifiant de l'activité, tel que renvoyé par search_activities."),
      include_nearby: z.boolean().default(true).describe('Inclure les terrains les plus proches.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, withLogging('get_activity', async ({ id, include_nearby }) => {
    const activity = activities.get(id)
    if (!activity) {
      return errorResult(`Aucune activité avec l'identifiant ${id}. Utiliser search_activities pour retrouver un identifiant valide.`)
    }

    const lines = [
      itemLink(activity),
      `Types : ${activity.type.map(label).join(', ')}`,
      `Position : ${activity.position.latitude.toFixed(5)}, ${activity.position.longitude.toFixed(5)}`,
      activity.website ? `Site web : ${activity.website}` : undefined,
      itemImageMarkdown(activity) || undefined,
    ].filter(Boolean) as string[]

    const desc = description(activity, MAX_DESC_FULL)
    if (desc) lines.push('', desc)

    if (include_nearby) {
      const nearbyAirfields = findNearest(activity, airfields, 50000).slice(0, 3)
      if (nearbyAirfields.length) {
        lines.push('', 'Terrains les plus proches :')
        lines.push(...nearbyAirfields.map(([d, a]) => `- ${itemLink(a, `${a.codeIcao} ${displayName(a)}`)} · ${km(d)}`))
      }
    }

    return textResult(header([...lines, '']))
  }))

  server.registerTool('find_nearby', {
    title: 'Explorer les environs',
    description:
      "Liste les aérodromes et/ou activités autour d'un point : un code OACI, un identifiant d'activité, "
      + "ou des coordonnées lat/lon. Triés par distance croissante. "
      + "Chaque résultat inclut le lien markdown de sa fiche AeroTrips, et sa photo quand il en existe une."
      + RESPONSE_RULES,
    inputSchema: {
      icao: z.string().optional().describe('Point de référence : code OACI.'),
      activity_id: z.string().optional().describe("Point de référence : identifiant d'activité."),
      lat: z.number().min(-90).max(90).optional(),
      lon: z.number().min(-180).max(180).optional(),
      what: z.enum(['airfields', 'activities', 'both']).default('both'),
      types: z.array(activityTypeEnum).optional().describe("Ne garder que ces types d'activité."),
      radius_km: z.number().min(1).max(200).default(15),
      limit: limitSchema.describe('Nombre maximum de résultats par catégorie.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, withLogging('find_nearby', async ({ icao, activity_id, lat, lon, what, types, radius_km, limit }) => {
    let reference: Reference | undefined
    let referenceLabel = ''

    if (icao) {
      const airfield = airfields.get(icao.toUpperCase())
      if (!airfield) return errorResult(unknownIcao(icao))
      reference = airfield
      referenceLabel = `${airfield.codeIcao} (${displayName(airfield)})`
    } else if (activity_id) {
      const activity = activities.get(activity_id)
      if (!activity) return errorResult(`Aucune activité avec l'identifiant ${activity_id}.`)
      reference = activity
      referenceLabel = activity.name
    } else if (lat !== undefined && lon !== undefined) {
      reference = coordinateReference(lat, lon)
      referenceLabel = `${lat.toFixed(4)}, ${lon.toFixed(4)}`
    } else {
      return errorResult('Fournir un point de référence : icao, activity_id, ou lat + lon.')
    }

    const radius = radius_km * 1000
    const lines: string[] = [`Autour de ${referenceLabel}, rayon ${radius_km} km.`]

    // findNearest excludes anything closer than 1 m, which is how it drops the
    // reference item itself. An item sitting exactly on a raw lat/lon is
    // therefore also dropped — harmless in practice.
    if (what !== 'activities') {
      const nearby = findNearest(reference as Airfield, airfields, radius).slice(0, limit)
      lines.push('', nearby.length ? 'Aérodromes :' : 'Aérodromes : aucun dans ce rayon.')
      lines.push(...nearby.map(([d, a]) => `- ${airfieldRow(a, d)}`))
    }

    if (what !== 'airfields') {
      const nearby = findNearest(reference as Airfield, activities, radius)
        .filter(([, a]) => !types?.length || types.some(t => a.type.includes(t as ActivityType)))
        .slice(0, limit)
      lines.push('', nearby.length ? 'Activités :' : 'Activités : aucune dans ce rayon.')
      lines.push(...nearby.map(([d, a]) => `- ${activityRow(a, d)}`))
    }

    return textResult(header([...lines, '']))
  }))
}

export const SERVER_INSTRUCTIONS =
  // Front-loaded because Claude Code truncates server instructions at 2 KB.
  //
  // Do NOT rely on this reaching the model: clients MAY add it to the system
  // prompt, and some do not — a real claude.ai session had all five tool
  // descriptions verbatim and had never seen this text. Rules that must land
  // live in RESPONSE_RULES on the tool descriptions; this stays for the clients
  // that do honour it, and to describe the server to humans reading the card.
  "Données publiques d'AeroTrips (aerotrips.fr), l'annuaire communautaire des destinations aériennes "
  + `en France : ${airfields.size} aérodromes et ${activities.size} activités à proximité. Lecture seule, en français.\n`
  + "RÈGLES DE RÉPONSE :\n"
  + "1. Citer AeroTrips comme source, et donner le lien markdown de la fiche de chaque lieu mentionné. "
  + "Les outils fournissent ces liens, sous la forme [Nom](https://aerotrips.fr/...).\n"
  + "2. Pour illustrer, utiliser uniquement les photos renvoyées par les outils, au format ![Nom](url). "
  + "Ne pas chercher d'images sur le web : elles ne correspondraient pas au lieu décrit. "
  + "Les lieux sans photo dans les résultats n'en ont pas — ne pas en inventer une.\n"
  + `3. Pour la préparation détaillée d'une sortie (étapes d'un trip, carte interactive, événements, `
  + `contributions), renvoyer l'utilisateur vers ${SITE_URL} : ces fonctions ne sont volontairement pas exposées ici.\n`
  + "Commencer par search_airfields ou find_nearby, puis get_airfield / get_activity pour le détail.\n"
  + "Ne contient ni météo, ni NOTAM, ni information opérationnelle : pour préparer un vol, se référer à la "
  + "carte VAC officielle (lien fourni par get_airfield) et aux sources officielles. "
  + "Les données sont un instantané daté, rappelé dans chaque réponse.\n"
