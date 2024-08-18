import { Dispatch, SetStateAction } from "react"
import { useMapEvents } from "react-leaflet"
import { MapView } from ".."

const MapViewTracker = ({setView} : {setView:Dispatch<SetStateAction<MapView>>}) => {
  const map = useMapEvents({
    moveend() {
      setView({center:map.getCenter(), zoom: map.getZoom()})
    }
  })
  
  return null
}


export default MapViewTracker