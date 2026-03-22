import { Profile } from "..";
import { EditorView } from "@tiptap/pm/view";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";


export const fetchAndUploadImageUrl = async (
  view: EditorView,
  pos: number,
  url: string,
  profile?: Profile
) => {
  let file: File;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Fetch failed');
    const blob = await response.blob();
    file = new File([blob], 'dropped-image', { type: blob.type });
  } catch {
    window.alert("Impossible de récupérer l'image depuis cette URL.");
    return;
  }

  uploadImage(view, pos, file, profile);
};

export const uploadImage = (view: EditorView, pos: number, file: File, profile?: Profile) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    window.alert("Les images doivent être au format .png, .jpg ou .webp");
    return;
  }
  if (file.size >= 2 ** 19) {
    window.alert("Les images doivent faire moins de 500 ko");
    return;
  }
  
  if(profile) {
    const storage = getStorage();
    const storageRef = ref(storage, `img/${profile.uid}/${Math.random().toString(36).substring(2)}`);
    uploadBytes(storageRef, file, {contentType: file.type})
    .catch(e => console.error(e))
    .then(() => {
      getDownloadURL(storageRef).then((url) => {
        const { schema } = view.state;
        const node = schema.nodes.image.create({ src: url }); // creates the image element
        const transaction = view.state.tr.insert(pos, node); // places it in the correct position
        return view.dispatch(transaction);
      })
    })
  } else {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function () {
      const { schema } = view.state;
      const node = schema.nodes.image.create({ src: reader.result }); // creates the image element
      const transaction = view.state.tr.insert(pos, node); // places it in the correct position
      return view.dispatch(transaction);
    }
  }
}