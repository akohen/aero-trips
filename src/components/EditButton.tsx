import { Tooltip } from "@mantine/core";
import { IconEdit } from "@tabler/icons-react";
import { Link } from "react-router-dom";

const EditButton = () => (
  <Link to={"edit"}>
    <Tooltip label="Modifier">
      <IconEdit color="black" className="title-button"/>
    </Tooltip>
  </Link>
)

export default EditButton