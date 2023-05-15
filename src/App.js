import { Auth0Client } from '@auth0/auth0-spa-js';
import { Browser } from '@capacitor/browser';
import './App.css';
import {useCallback, useEffect, useMemo, useState} from "react";
import {Capacitor} from "@capacitor/core";
import { App } from '@capacitor/app';

function Application() {

  const packageId = process.env.REACT_APP_PACKAGE_ID
  const domain = process.env.REACT_APP_AUTH0_DOMAIN
  const redirectUri = `${packageId}://${domain}/capacitor/${packageId}/login`
  const isNative = Capacitor.isNativePlatform();

  const [email, setEmail] = useState(null)

  const auth0 = useMemo(() => {
    return new Auth0Client({
      domain,
      clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,
      useRefreshTokens: true,
      useRefreshTokensFallback: false,
      authorizationParams: {
        redirect_uri: isNative ? redirectUri : window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
      }
    });
  }, [redirectUri, isNative])

  const login = useCallback(async () => {
    await auth0.loginWithRedirect({
      async openUrl(url) {
        await Browser.open({
          url,
          windowName: '_self',
        });
      },
      authorizationParams: {
        theme: "agent",
        // prompt: 'login'
      }
    });
  }, [auth0])


  const checkLogin = useCallback(async (url = window.location.href) => {
    try {
      await auth0.handleRedirectCallback(url);
    } catch (e) {
      console.log("### error", e)
    }
    await auth0.getTokenSilently({
      cacheMode: 'off',
      authorizationParams: {
        appVariantIdentifier: 'agent'
      }
    });
    const {email} = await auth0.getIdTokenClaims()
    setEmail(email)
  }, [])

  const appUrlOpen = useCallback(async ({url}) => {
    console.log("### url", url)
    await checkLogin(url)
    await Browser.close()
  }, []);




  useEffect(() => {
    const addListener = async () => {
      console.log("### addlistner")
      await App.removeAllListeners();
      await App.addListener('appUrlOpen', appUrlOpen);
    }
    const removeListener = async () => {
      await App.removeAllListeners();
    }

    addListener()

    if (!isNative) {
      checkLogin()
    }
    return () => {
      removeListener()
    };
  }, [auth0]);


  return (
    <div>
      <button onClick={login}>Login</button>
      <div>{email && `Logged in: ${email}`}</div>
    </div>
  );
}

export default Application;
