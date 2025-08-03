import {BrowserRouter as Router , Routes , Route} from "react-router-dom";
import CategoryPage from "./CategoryPage";
import Products from "./Products";
import SignUp from "./SIgnUp";
import Login from "./Login";
const App = () => {
  return(
    <div>
      <Router>
        <Routes>
          <Route path="/" element={<CategoryPage />} />
          <Route path="/products" element={<Products />} />
          <Route path="/products/:categoryId" element={<Products />} />
          <Route path="/SignUp" element={<SignUp />} />
          <Route path="/Login" element={<Login />} />
         </Routes>
      </Router>       
    </div>
  
  );

};

export default App;