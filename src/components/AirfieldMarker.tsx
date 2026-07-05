import { Airfield } from "..";
import { Stack } from "@mantine/core";
import { Link } from "react-router";
import { Marker, Popup } from 'react-leaflet'
import { Icon } from 'leaflet';
import pinRunway from '/map-pin-runway.svg'
import { getResizedUrl } from "../utils/image";
import { AirfieldTitle } from "./AirfieldUtils";

export const AirfieldMarker = ({airfield}: {airfield:Airfield}) => {
  const imgNode = airfield.description?.content != undefined ? airfield.description.content.find( (a: { type: string }) => a.type =='image') : undefined
  return (
  <Marker
    position={[airfield.position.latitude,airfield.position.longitude]}
    icon={new Icon({iconUrl: pinRunway, iconAnchor:[25,49], iconSize:[50,50]})}
    zIndexOffset={1000}
  >
    <Popup>
      <Link to={`/airfields/${airfield.codeIcao}`}>
        <Stack align="center" gap={"xs"}>
          <div><AirfieldTitle ad={airfield}/></div>
          {imgNode != undefined && (
            <img
              src={imgNode.attrs.src} width="150px"
              onError={(e) => {
                const img = e.currentTarget;
                if (!img.dataset.fallbackAttempted) {
                  img.dataset.fallbackAttempted = 'true';
                  img.src = getResizedUrl(imgNode.attrs.src);
                }
              }}
            />
          )}
          <span>Voir plus de détails...</span>
        </Stack>
      </Link>
    </Popup>
  </Marker>
)}
