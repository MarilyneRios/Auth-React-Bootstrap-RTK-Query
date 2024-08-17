import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { app } from '../firebase';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Button,  } from "react-bootstrap";
import { signInSuccess } from '../redux/userSlice';
// Importation de useSignInMutation:
import { useGoogleSignInMutation} from "../redux/usersApiSlice";

export default function OAuth(  {label}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Déclaration RTK Query du hook useGoogleSignInMutation pour GoogleSignIn
  const [googleSignIn] = useGoogleSignInMutation();

  const handleGoogleClick = async () => {
    try {
        // Création d'une instance de fournisseur d'authentification Google
        const provider = new GoogleAuthProvider();
        // Récupération de l'instance d'authentification Firebase
        const auth = getAuth(app);

        // Affichage de la fenêtre pop-up pour l'authentification Google
        const result = await signInWithPopup(auth, provider);
 
        // Envoi des user data au serveur avec RTK Query
        const { name, email, photoURL } = result.user;
        const res = await googleSignIn({
          name,
          email,
          photo: photoURL,
        }).unwrap();


       
        // Dispatch de l'action signInSuccess avec les données utilisateur
        dispatch(signInSuccess(res));
        // Navigation vers la page home
        navigate('/');
       
    } catch (error) {
        console.log('connexion avec google impossible', error);
    }
  };

  return (
    <Button
      type='button'
      variant="outline-dark"
      onClick={handleGoogleClick}
      className='w-100 d-flex align-items-center justify-content-center gap-2'
    >
    <img
            src="https://img.icons8.com/?size=100&id=17949&format=png&color=000000"
            alt="Google"
            height="25"
            width="25"
          />
        {label}
    </Button>
  );
}