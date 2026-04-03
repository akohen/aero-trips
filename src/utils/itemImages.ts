import { ActivityType, Runway } from '..';

export const getAirfieldImage = (imgNode: { attrs: { src: string } } | undefined, runways: Runway[]) => {
  if (imgNode) return imgNode.attrs.src
  if (runways.some(r => r.composition != 'GRASS')) return 'https://static.wixstatic.com/media/249296_6c727c318fd340f4856e5041e95c07c7~mv2.jpg'
  return 'https://pbs.twimg.com/media/ETyrrMJWkAA-Kd9?format=jpg&name=large'
}

export const getActivityImage = (imgNode: { attrs: { src: string } } | undefined, types: ActivityType[]) => {
  if (imgNode) return imgNode.attrs.src
  if (types.includes('food')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Frestaurant.jpg?alt=media&token=257ab852-a209-414d-8d77-671d91ce3aa7'
  if (types.includes('lodging')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Flodging.jpg?alt=media&token=93c51d40-d215-4fa2-b69c-51162fe5717d'
  if (types.includes('transit')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Ftransit.jpg?alt=media&token=375e623c-aec6-4e51-a888-cfd38019a7d0'
  if (types.includes('bike')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fbike.jpg?alt=media&token=161bd4af-01b7-4be5-b3f9-c4bd22aca5db'
  if (types.includes('car')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fcar.jpg?alt=media&token=3b0bfb95-b994-487c-8552-fd88e5b7fccc'
  if (types.includes('hiking')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fhiking.jpg?alt=media&token=942cf1d2-1501-4524-bc10-c2fe425253e8'
  if (types.includes('nautical')) return 'https://firebasestorage.googleapis.com/v0/b/aero-trips.appspot.com/o/images%2Fnautical.jpg?alt=media&token=7d117c7e-e1d9-4787-9ec6-95064a1d5f94'
  return 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Placeholder_view_vector.svg/991px-Placeholder_view_vector.svg.png'
}

export const getImgNode = (description: { content?: { type: string; attrs?: { src: string } }[] } | undefined) =>
  description?.content?.find((n) => n.type === 'image') as { attrs: { src: string } } | undefined
