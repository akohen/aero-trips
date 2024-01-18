import { useParams } from "react-router-dom";

const AirfieldDetails = () => {
    const params = useParams();
    return (<p>Hello{params.airfieldId}</p>)
}

export default AirfieldDetails