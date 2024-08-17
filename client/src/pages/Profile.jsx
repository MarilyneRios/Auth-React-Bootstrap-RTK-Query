import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Form, Button, Image } from "react-bootstrap";
import FormContainer from "../components/FormContainer";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { FaUnlock } from "react-icons/fa";
import { FaTrashAlt } from "react-icons/fa";
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytesResumable,
} from "firebase/storage";
import { app } from "../firebase";
import { RingLoader } from "react-spinners";
import {
  updateUserStart,
  updateUserSuccess,
  updateUserFailure,
  deleteUserStart,
  deleteUserSuccess,
  deleteUserFailure,
  signOutSuccess,
} from "../redux/userSlice";
// Importation de useSignInMutation:
import {
  useSignOutMutation,
  useDeleteUserMutation,
  useUpdateUserMutation,
} from "../redux/usersApiSlice";

export default function Profile() {
  const { currentUser, loading } = useSelector((state) => state.user);
  //console.log("Token JWT:", currentUser?.accessToken);
  //réponse : Token JWT: undefined

  const [formData, setFormData] = useState({
    username: currentUser.username,
    email: currentUser.email,
    password: "",
    passwordConfirm: "",
    profilePicture: currentUser.profilePicture,
  });

  const [visiblePassword, setVisiblePassword] = useState(false);
  const [visibleConfirmPassword, setVisibleConfirmPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  // états pour upload images
  const [image, setImage] = useState(undefined);
  const [imagePercent, setImagePercent] = useState(0);
  // console.log(imagePercent);
  const [imageError, setImageError] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Vérifie si 'image' a une valeur. Si oui, la fonction handleFileUpload est appelée
  useEffect(() => {
    if (image) {
      handleFileUpload(image);
    }
  }, [image]);

  //Update images
  const handleFileUpload = async (image) => {
    const storage = getStorage(app);
    const fileName = new Date().getTime() + image.name;
    const storageRef = ref(storage, fileName);
    const uploadTask = uploadBytesResumable(storageRef, image);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setImagePercent(Math.round(progress));
      },
      (error) => {
        console.error(error);
        setImageError("Erreur lors du téléchargement de l'image");
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadURL) => {
            setFormData((prevData) => ({
              ...prevData,
              profilePicture: downloadURL,
            }));
            setUpdateSuccess(true);
            setImagePercent(100);
          })
          .catch((error) => {
            console.error(error);
            setImageError(
              "Erreur lors de l'obtention de l'URL de téléchargement"
            );
          });
      }
    );
  };

  // hook de navigation
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Déclaration RTK Query du hook useSignInMutation pour sign-in
  const [signOut, { isLoading, isError, isSuccess }] = useSignOutMutation();
  const [deleteUser] = useDeleteUserMutation();
  const [updateUser] = useUpdateUserMutation();

  const fileRef = useRef(null);

  // Fonction de gestion du changement de valeur des champs du formulaire
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
    setLocalError("");
  };
  console.log(formData);

  // Fonction de validation de fichier (si erreur)
  const validateFile = (file) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Le fichier doit être une image");
      return false;
    }
    if (file.size > 2 * 1024 * 1024) {
      // 2 MB
      setImageError("L'image doit être inférieure à 2 Mo");
      return false;
    }
    setImageError(""); // Réinitialiser les erreurs
    return true;
  };

  // Fonction de soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      setLocalError("Les mots de passe ne correspondent pas !");
      return;
    }

    // Créez une copie de l'objet formData
    const updatedData = { ...formData };

    // Vérifiez si le champ 'password' est vide
    if (!updatedData.password) {
      // Si le champ 'password' est vide, supprimez les propriétés 'password' et 'passwordConfirm'
      delete updatedData.password;
      delete updatedData.passwordConfirm;
    }

    try {
      dispatch(updateUserStart());
  
         // La mutation pour updateUser via RTK Query et ".unwrap();"
         const res = await updateUser({
          id: currentUser._id,
          // Mettre à jour les données à mettre à jour
          data: updatedData, 
        }).unwrap();

  
      if (res.success === false) {
        dispatch(updateUserFailure(res));
        return;
      }
      dispatch(updateUserSuccess(res));
      setUpdateSuccess(true);
    } catch (error) {
      dispatch(updateUserFailure(error));
    }
  };

  // Supprimer un compte User
  const handleDeleteAccount = async () => {
    try {
      dispatch(deleteUserStart());

      // Savoir où cela commence dans la console
      //console.log("Début de la suppression de l'utilisateur");

      // Vérifier les datas envoyées à la mutation RTK Query
      //console.log("ID de l'utilisateur :", currentUser._id);
      //console.log("Token JWT :", currentUser.accessToken);

      // La mutation pour deleteUser via RTK Query et ".unwrap();"
      const res = await deleteUser({
        id: currentUser._id,
        // token JWT du user dans header sinon erreur 401 Unauthorized
        headers: {
          Authorization: `Bearer ${currentUser.accessToken}`,
        },
      }).unwrap();

      // Voir la réponse de l'API
      //console.log("Réponse de l'API après la suppression :", res);

      // Vérification de la réponse
      if (res.success === false) {
        //console.log("Échec de la suppression de l'utilisateur :", res);
        dispatch(deleteUserFailure(res));
        return;
      }

      // Si tout est ok, succès de la suppression
      //console.log("Suppression de l'utilisateur réussie :", res);
      dispatch(deleteUserSuccess(res));
      navigate("/");
    } catch (error) {
     // console.error("Erreur lors de la suppression de l'utilisateur :", error);
      dispatch(deleteUserFailure(error));
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut().unwrap();
      dispatch(signOutSuccess());
      navigate("/");
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    }
  };

  const { username, email, password, passwordConfirm } = formData;

  return (
    <FormContainer>
      <h1 className="d-flex justify-content-center text-dark">Profil</h1>
      <Form onSubmit={handleSubmit}>
        {/* Image de profil */}
        <Form.Group className="my-2 d-flex justify-content-center">
          <div
            className="position-relative d-flex flex-column align-items-center"
            style={{ width: "100px", height: "130px" }}
          >
            <div
              className="position-relative cursor-pointer"
              style={{ width: "100px", height: "100px" }}
              onClick={() => fileRef.current.click()}
            >
              <Image
                src={formData.profilePicture || currentUser.profilePicture}
                alt="image de profil"
                className="rounded-circle object-cover border border-dark"
                style={{ width: "100px", height: "100px" }}
              />
              {imagePercent > 0 && imagePercent < 100 && (
                <div
                  className="position-absolute top-50 start-50 translate-middle"
                  style={{ width: "100px", height: "100px" }}
                >
                  <RingLoader size={100} color="#208537" loading={true} />
                </div>
              )}
            </div>
            <p
              className="text-center mt-2"
              style={{ display: "inline-block", width: "250px" }}
            >
              {imageError ? (
                <span className="text-danger">{imageError}</span>
              ) : imagePercent > 0 && imagePercent < 100 ? (
                <span className="text-dark">{`Téléchargement : ${imagePercent}%`}</span>
              ) : imagePercent === 100 ? (
                <span className="text-success">
                  Image téléchargée avec succès
                </span>
              ) : (
                ""
              )}
            </p>
          </div>
          <Form.Control
            type="file"
            accept="image/*"
            ref={fileRef}
            hidden
            onChange={(e) => {
              const file = e.target.files[0];
              if (validateFile(file)) {
                setImagePercent(0);
                setImage(file);
              }
            }}
          />
          {imageError && (
            <p className="text-danger text-center">{imageError}</p>
          )}
        </Form.Group>

        <Form.Group className="my-2">
          <Form.Control
            type="text"
            id="username"
            placeholder="Pseudo"
            value={username}
            onChange={handleChange}
            autoComplete="username"
          />
        </Form.Group>

        <Form.Group className="my-2">
          <Form.Control
            type="email"
            id="email"
            placeholder="Email"
            value={email}
            onChange={handleChange}
            autoComplete="email"
          />
        </Form.Group>

        <Form.Group className="my-2">
          <div className="d-flex">
            <Form.Control
              type={visiblePassword ? "text" : "password"}
              id="password"
              placeholder="Mot de passe"
              value={password}
              onChange={handleChange}
              autoComplete="current-password"
              className="me-2"
            />
            {visiblePassword ? (
              <FaEyeSlash
                onClick={() => setVisiblePassword(false)}
                className="m-3"
                size={20}
              />
            ) : (
              <FaEye
                onClick={() => setVisiblePassword(true)}
                size={20}
                className="m-3"
              />
            )}
          </div>
        </Form.Group>

        <Form.Group className="my-2">
          <div className="d-flex">
            <Form.Control
              type={visibleConfirmPassword ? "text" : "password"}
              id="passwordConfirm"
              placeholder="Confirmation du mot de passe"
              value={passwordConfirm}
              onChange={handleChange}
              autoComplete="new-password"
              className="me-2"
            />
            {visibleConfirmPassword ? (
              <FaEyeSlash
                onClick={() => setVisibleConfirmPassword(false)}
                className="m-3"
                size={20}
              />
            ) : (
              <FaEye
                onClick={() => setVisibleConfirmPassword(true)}
                size={20}
                className="m-3"
              />
            )}
          </div>
        </Form.Group>

        <Button
          type="submit"
          variant="outline-dark"
          className="my-3 w-100"
          disabled={loading}
        >
          {loading ? "Loading..." : "Enregistrer"}
        </Button>
        <div className="d-flex justify-content-between mt-3">
          <span className="btn text-danger " onClick={handleDeleteAccount}>
            <FaTrashAlt /> Supprimer le compte
          </span>
          <span className="btn text-danger " onClick={handleSignOut}>
            <FaUnlock /> Déconnexion
          </span>
        </div>
        <div>
          <p className="text-danger mt-5">
            {localError && "Quelque chose ne va pas !"}
          </p>
          <p className="text-success mt-5">
            {updateSuccess &&
              "Les modifications sont mises à jour avec succès !"}
          </p>
        </div>
      </Form>
    </FormContainer>
  );
}
