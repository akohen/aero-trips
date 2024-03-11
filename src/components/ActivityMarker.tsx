import { Stack } from "@mantine/core"
import { Link } from "react-router-dom"
import { Activity, ActivityType } from ".."
import { ActivityTitle } from "./ActivityUtils"
import { Marker, Popup } from "react-leaflet"
import { Icon } from "leaflet"
import pinActivity from '/map-pin-activity.svg'
import bikeActivity from '/map-pin-bike.svg'
import eyeActivity from '/map-pin-eye.svg'
import lodgingActivity from '/map-pin-lodging.svg'
import foodActivity from '/map-pin-food.svg'
import transitActivity from '/map-pin-transit.svg'
import carActivity from '/map-pin-car.svg'
import hikingActivity from '/map-pin-hiking.svg'
import nauticalActivity from '/map-pin-nautical.svg'
import natureActivity from '/map-pin-nature.svg'

const selectIcon = (types: ActivityType[]) => {
  if(types.includes('lodging')) return lodgingActivity
  if(types.includes('nautical')) return nauticalActivity
  if(types.includes('food')) return foodActivity
  if(types.includes('bike')) return bikeActivity
  if(types.includes('nature')) return natureActivity
  if(types.includes('hiking')) return hikingActivity
  if(types.includes('transit')) return transitActivity
  if(types.includes('car')) return carActivity
  if(types.includes('poi')) return eyeActivity
  return pinActivity
}

const ActivityMarker = ({id, activity}: {id:string, activity:Activity}) => {
    const imgNode = activity.description?.content != undefined ? activity.description.content.find( (a: { type: string }) => a.type =='image') : undefined
    return (
    <Marker
      position={[activity.position.latitude,activity.position.longitude]}
      icon={new Icon({iconUrl: selectIcon(activity.type), iconAnchor:[25,49], iconSize:[50,50]})}
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