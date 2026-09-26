import { SimpleGrid, Text, TextInput, Title } from "@mantine/core"
import { useMemo, useState } from "react"
import { useParams } from "react-router"
import { Airfield, Data } from ".."
import NotFound from "./NotFound"
import CardListItem from "../components/CardListItem"
import { CardConfig } from "../components/CardList"
import { usePageSeo } from "../hooks/usePageSeo"
import { getItemCardConfig, getItemImageUrl, getItemLink } from "../utils/itemCardConfig"
import { buildLandingEntries, buildLandingSeo, LANDING_PAGES, LandingPage as Page, Nearby } from "../utils/landingPages"
import { formatDistance } from "../utils/utils"

const MAX_HIGHLIGHTS = 3

const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "")

// The addresses that put the airfield on the page. The whole card links to the airfield
// page (where they are clickable), so they are plain text here: no link inside a link.
// On a photo (darkened at the bottom by `shadeBottom`), a light shadow keeps the text crisp
const ON_PHOTO = { textShadow: '0 1px 2px rgba(0,0,0,0.8)' }

const Highlights = ({ highlights, onPhoto }: { highlights: Nearby[], onPhoto: boolean }) => {
  const more = highlights.length - MAX_HIGHLIGHTS
  const style = onPhoto ? ON_PHOTO : undefined
  return (<>
    {highlights.slice(0, MAX_HIGHLIGHTS).map(([dist, activity, id]) => (
      <Text key={id} size="sm" fw={500} truncate style={style}>{activity.name} · {formatDistance(dist)}</Text>
    ))}
    {more > 0 && <Text size="xs" style={style}>+ {more} autre{more > 1 ? 's' : ''}</Text>}
  </>)
}

const LandingContent = ({ page, airfields, activities, profile }: Data & { page: Page }) => {
  const entries = useMemo(() => buildLandingEntries(page, airfields, activities), [page, airfields, activities])
  const seo = useMemo(() => buildLandingSeo(page, entries), [page, entries])
  usePageSeo(seo)
  const [search, setSearch] = useState('')
  const query = normalize(search.trim())
  const shown = query
    ? entries.filter(e => [e.airfield.name, e.airfield.codeIcao, ...e.highlights.map(([, a]) => a.name)].some(s => normalize(s).includes(query)))
    : entries

  const highlightsByIcao = new Map(entries.map(e => [e.airfield.codeIcao, e.highlights]))
  const cardConfig: CardConfig<Airfield> = {
    ...(getItemCardConfig({ profile }) as CardConfig<Airfield>),
    content: (airfield) => <Highlights highlights={highlightsByIcao.get(airfield.codeIcao) ?? []} onPhoto={Boolean(getItemImageUrl(airfield))} />,
  }

  return (<>
    <Title order={1}>{page.h1}</Title>
    {page.intro.map((p, i) => <Text key={i} mt="sm">{p}</Text>)}
    <TextInput
      mt="md"
      placeholder="Rechercher un terrain, un code OACI ou une adresse"
      aria-label="Rechercher"
      value={search}
      onChange={(e) => setSearch(e.currentTarget.value)}
    />
    <Text size="sm" c="dimmed" mt="xs">{shown.length} terrain{shown.length > 1 ? 's' : ''}</Text>
    {/* All cards at once, no pagination: Google renders the page and should see every airfield */}
    <SimpleGrid mt="sm" minColWidth="280px">
      {shown.map(({ airfield }) => (
        <CardListItem
          key={airfield.codeIcao}
          item={airfield}
          imgUrl={getItemImageUrl(airfield)}
          link={getItemLink(airfield)}
          cardConfig={cardConfig}
          itemKey={airfield.codeIcao}
          shadeBottom
        />
      ))}
    </SimpleGrid>
  </>)
}

const LandingPage = (data: Data) => {
  const { slug } = useParams()
  const page = LANDING_PAGES.find(p => p.slug === slug)
  if (!page) return <NotFound />
  return <LandingContent {...data} page={page} />
}

export default LandingPage
