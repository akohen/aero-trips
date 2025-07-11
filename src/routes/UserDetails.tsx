import { Link, useParams } from "react-router-dom";
import { Data } from "..";
import BackButton from "../components/BackButton";
import { Paper, Title } from "@mantine/core";
import { TripTitle } from "../components/TripsUtils";

const UserDetails = (data : Data) => {
  const params = useParams();
  const userId = params.userId;
  const trips = [...data.trips].filter(([, trip]) => trip.uid === userId);


  return data.trips.size > 0 ? trips.length > 0 ? (
    <><Title order={1}><BackButton />Sorties partagées par {trips[0][1].author}</Title>
      <Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
        <Title order={4}>Sorties partagées ({trips.length})</Title>
        <ul>
          { trips.map( ([key, trip], i) => (
            <li key={i}>
              <Link to={`/trips/${key}`}><TripTitle trip={trip} details /></Link>
            </li>
          ))}
        </ul>
      </Paper></>
  ) : (
    <p>Cet utilisateur n'a pas encore partagé de sorties</p>
  ) : (
    <p>Chargement en cours</p>
  )
}

export default UserDetails