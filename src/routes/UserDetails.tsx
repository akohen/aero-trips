import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { doc, getDoc } from "firebase/firestore";
import { Data } from "..";
import BackButton from "../components/BackButton";
import { Paper, Text, Title } from "@mantine/core";
import { TripTitle } from "../components/TripsUtils";
import { AirfieldTitle } from "../components/AirfieldUtils";
import { db } from "../data/firebase";
import { PASSPORT_IMAGES, PASSPORTS, PublicPassport, passportImageUrl } from "../utils/passport";
import { buildPassportBadgeSvg, svgDataUrl } from "../utils/passportBadge";
import { storageBucket } from "../data/firebase";
import { usePassportMapSvg } from "../hooks/usePassportMapSvg";

const UserDetails = (data : Data) => {
  const params = useParams();
  const userId = params.userId;
  const trips = [...data.trips].filter(([, trip]) => trip.uid === userId);
  // undefined while loading, null when the pilot has no public passport
  const [passport, setPassport] = useState<PublicPassport | null>()

  useEffect(() => {
    if (!userId) return
    getDoc(doc(db, PASSPORTS, userId))
      .then(snap => setPassport(snap.exists() ? snap.data() as PublicPassport : null))
      .catch(e => { console.error('[UserDetails] passport', e); setPassport(null) })
  }, [userId])

  // The published map; drawn locally only if it isn't there yet (e.g. rendered before the map existed)
  const [mapMissing, setMapMissing] = useState(false)
  const localMap = usePassportMapSvg({
    displayName: passport?.displayName || undefined,
    homebase: passport?.homebase ?? undefined,
    visited: passport?.visited ?? [],
    airfields: data.airfields,
  }, mapMissing && !!passport)

  const name = passport?.displayName || trips[0]?.[1].author
  const loading = passport === undefined || data.trips.size === 0

  if (!passport && trips.length === 0) {
    return <p>{loading ? "Chargement en cours" : "Cet utilisateur n'a encore rien partagé"}</p>
  }

  return (<>
    <Title order={1}><BackButton />{name ? `Profil de ${name}` : "Profil pilote"}</Title>
    { passport && (
      <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
        <Title order={4}>Passeport pilote</Title>
        <img
          // The published PNG (same rendering everywhere); the local SVG until it exists
          src={passportImageUrl(storageBucket, userId!, PASSPORT_IMAGES.png)}
          srcSet={`${passportImageUrl(storageBucket, userId!, PASSPORT_IMAGES.png2x)} 2x`}
          onError={e => {
            if (e.currentTarget.src.startsWith('data:')) return
            e.currentTarget.srcset = ''
            e.currentTarget.src = svgDataUrl(buildPassportBadgeSvg({ homebase: passport.homebase ?? undefined, visitedCount: passport.visited.length }))
          }}
          alt={`${passport.visited.length} terrain${passport.visited.length > 1 ? 's' : ''} visité${passport.visited.length > 1 ? 's' : ''}`}
          style={{ display: 'block', margin: '12px 0', maxWidth: '100%' }}
        />
        <img
          src={mapMissing ? (localMap ? svgDataUrl(localMap) : undefined) : passportImageUrl(storageBucket, userId!, PASSPORT_IMAGES.map)}
          onError={() => setMapMissing(true)}
          alt={`Carte des terrains visités${name ? ` par ${name}` : ''}`}
          style={{ display: 'block', width: '100%', maxWidth: 360, margin: '12px 0', borderRadius: 8, aspectRatio: '4 / 5', background: '#16233F' }}
        />
        { passport.visited.map(id => {
          const ad = data.airfields.get(id)
          return <Text key={id} size="sm" className="ad-list">
            <Link to={`/airfields/${id}`}>{id} {ad ? <AirfieldTitle ad={ad} /> : null}</Link>
          </Text>
        })}
      </Paper>
    )}
    { trips.length > 0 && (
      <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
        <Title order={4}>Sorties partagées ({trips.length})</Title>
        <ul>
          { trips.map( ([key, trip], i) => (
            <li key={i}>
              <Link to={`/trips/${key}`}><TripTitle trip={trip} details /></Link>
            </li>
          ))}
        </ul>
      </Paper>
    )}
  </>)
}

export default UserDetails
