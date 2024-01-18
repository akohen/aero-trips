import { useState } from 'react'
import { Button } from '@mantine/core';
import { Airfield } from '../types';
import { DataContext } from '../DataProvider';


const Page = (props: {airfields: Airfield[] | undefined}) => {
  const [count, setCount] = useState(0)

  return (<>
  <h1>Vite + React</h1>
  <div className="card">
  <Button onClick={() => setCount((count) => count + 1)}>
      count is {count}
  </Button>
  <p>
      Edit <code>src/App.tsx</code> and save to test HMR
  </p>
  <div>{props.airfields ? props.airfields.map(e => (<p key={e.codeIcao}>{e.codeIcao}</p>)): <p>Loading</p>}</div>
  </div>
  <p className="read-the-docs">
  Click on the Vite and React logos to learn more
  </p>
</>)}

function Home() {
  return (
    <DataContext.Consumer>
      {data => <Page airfields={data.airfields} />}
    </DataContext.Consumer>
  )
}

export default Home
