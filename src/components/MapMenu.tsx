import { Button, MantineProvider } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useState } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Polyline, useMapEvents } from "react-leaflet";
import { BrowserRouter, Link } from "react-router-dom";

const MapMenu = () => {
  const [opened, setRuler] = useDisclosure()
  const [state, setState] = useState({start: {lat: 0, lng: 0}, end:{lat: 0, lng: 0}, mousePos: {x: 0, y: 0}, hide: false})
  
  const map = useMapEvents({
    contextmenu(e) {
      setState({start:e.latlng, end:e.latlng, mousePos:e.containerPoint, hide:false})
      setRuler.open()
      const div = document.createElement("div");
      flushSync(() => { // I'm sad, but I don't think there's a better way for this
        createRoot(div).render(
          <BrowserRouter>
            <MantineProvider>
              <Button 
                component={Link}
                to={`/edit/${e.latlng.lat}/${e.latlng.lng}`}
                style={{color: 'white'}}
              >
                Ajouter un lieu ici
              </Button>
            </MantineProvider>
          </BrowserRouter>);
      });
      map.openPopup(div.innerHTML, e.latlng, {className: 'map-context-menu'})
    },
    click() { setRuler.close() },
    mousemove(e) { 
      if(opened) {
        const newState = {...state, end: e.latlng}
        const mouseDistance = (state.mousePos.x - e.containerPoint.x)**2 + (state.mousePos.y - e.containerPoint.y)**2
        if(!state.hide && mouseDistance > 25000) newState.hide = true
        setState(newState)
        if(newState.hide) {
          const distance = map.distance(state.start,state.end)
          const kmDistance = distance > 10000 ? Math.round(distance/1000) : Math.round(distance/100) / 10
          const nmDistance = distance > 18520 ? Math.round(distance/1852) : Math.round(distance/185.2) /10
          map.openPopup(`${kmDistance}km - ${nmDistance}nm`, e.latlng, {closeButton: false})
        }
      }
    },
  })

  return (opened ? <><Polyline positions={[state.start, state.end]} /></> : null)
}

export default MapMenu