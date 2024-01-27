import { IconChevronLeft } from "@tabler/icons-react"
import { useNavigate  } from "react-router-dom"


const BackButton = () => {
  const navigate = useNavigate();
  return (<IconChevronLeft className="clickable" color="black" onClick={() => navigate(-1)}/>)}

export default BackButton