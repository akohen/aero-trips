import { Stack } from "@mantine/core"
import { Link } from "react-router-dom"
import { Activity } from ".."
import { ActivityTitle } from "./ActivityUtils"
import { Marker, Popup } from "react-leaflet"
import { Icon } from "leaflet"
import pinActivity from '/map-pin-activity.svg'

const ActivityMarker = ({id, activity}: {id:string, activity:Activity}) => {
    const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    return (
    <Marker
      position={[activity.position.latitude,activity.position.longitude]}
      icon={new Icon({iconUrl: pinActivity, iconAnchor:[25,49], iconSize:[50,50]})}
    >
      <Popup>
        <Link to={`/activities/${id}`}>
          <Stack align="center" gap={"xs"}>
            <div><ActivityTitle activity={activity}/></div>      
            {imgNode != undefined && <img src={imgNode.attrs.src} width="150px" />}
            <span>Voir plus de détails...</span>
          </Stack>
        </Link>
      </Popup>
    </Marker>
  )}

export default ActivityMarker