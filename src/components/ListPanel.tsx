import { Paper, Title } from "@mantine/core"
import { ReactNode } from "react"

const ListPanel = ({title, children}:{title: string, children: ReactNode}) => {
  if (!children || !Array.isArray(children) || children.length == 0) return
  
  return (<Paper shadow="md" radius="md" p='sm' mt="md" withBorder>
    <Title order={4}>{title}</Title>
      <ul>{children.map((child, index) => <li key={index}>{child}</li>)}</ul>
  </Paper>)
}
export default ListPanel