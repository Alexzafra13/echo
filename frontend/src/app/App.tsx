import { Route, Switch, Redirect } from 'wouter';
import LoginPage from '@features/auth/pages/LoginPage/LoginPage';

function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/">
        <Redirect to="/login" />
      </Route>
    </Switch>
  );
}

export default App;
