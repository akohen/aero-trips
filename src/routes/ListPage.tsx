
import poi from '../data/poi.json'

function ListPage() {
  
    return (
      <div>
        {poi.filter(x => x.type == 'airfield').map((x) => <p>{x.name} - {x.ICAO}</p>)}
      </div>
    )
  }
  
  export default ListPage