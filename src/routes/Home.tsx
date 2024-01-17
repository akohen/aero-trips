import { useState } from 'react'
import { Button } from '@mantine/core';
import { Data } from '../types';


function Home(props: {data: Data}) {
  const [count, setCount] = useState(0)

  return (
    <>
      <h1>Vite + React</h1>
      <div className="card">
      <Button onClick={() => setCount((count) => count + 1)}>
          count is {count}
      </Button>
      <p>
          Edit <code>src/App.tsx</code> and save to test HMR
      </p>
      <p>{props.data.airfields.map(e => e.codeOaci)}</p>
      </div>
      <p className="read-the-docs">
      Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default Home
