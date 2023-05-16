import { Auth0Client } from '@auth0/auth0-spa-js';
import { Browser } from '@capacitor/browser';
import {useCallback, useEffect, useMemo, useState} from "react";
import {Capacitor} from "@capacitor/core";
import { App } from '@capacitor/app';
import SQLiteStorage from 'redux-persist-sqlite-storage';


const getLocalStorageCache = () => {
  return {
    get(key) {
      console.log("# get", key)
      const value = localStorage.getItem(key)
      return JSON.parse(value);
    },
    set(key, value) {
      console.log("# set", key)
      localStorage.setItem(key, JSON.stringify(value));
    },
    remove(key) {
      console.log("# remove", key)
      localStorage.removeItem(key);
    },
    clear() {
      localStorage.clear()
    },
    allKeys() {
      return Object.keys(localStorage)
    },
  }
}


const getSqLiteStorageCache = () => {
  if (!Capacitor.isNativePlatform()) {
    return undefined;
  }

  const auth0KeyIdentifier = '@@auth0spajs@@';

  const sqlLiteStorageEngine = SQLiteStorage(
      window.sqlitePlugin,
      { androidDatabaseProvider: 'system' },
  );
  return {
    async get(key) {
      console.log("# get", key)
      const value = await sqlLiteStorageEngine.getItem(key);
      return JSON.parse(value);
    },
    async set(key, value) {
      console.log("# set", key)
      await sqlLiteStorageEngine.setItem(key, JSON.stringify(value));
    },
    async remove(key) {
      console.log("# remove", key)
      await sqlLiteStorageEngine.removeItem(key);
    },
    async clear() {
      const auth0Keys = await this._getAuth0Keys();
      return Promise.all(auth0Keys.map(async key => sqlLiteStorageEngine.removeItem(key)));
    },
    async allKeys() {
      return this._getAuth0Keys();
    },
    async _getAuth0Keys() {
      const allStoreKeys = await sqlLiteStorageEngine.getAllKeys();
      return allStoreKeys.filter(key => key.includes(auth0KeyIdentifier));
    },
  }
}

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
      cache: getSqLiteStorageCache(),
      authorizationParams: {
        redirect_uri: isNative ? redirectUri : window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE,
      }
    });
  }, [domain, redirectUri, isNative])

  const login = useCallback(async () => {
    await auth0.loginWithRedirect({
      async openUrl(url) {
        console.log("Open url", url)
        console.log("Redirect uri", redirectUri)
        await Browser.open({
          url,
          windowName: '_self',
        });
      },
      authorizationParams: {
        theme: "agent", // custom param needed for our universal login page
        // prompt: 'login'
      }
    });
  }, [redirectUri, auth0])


  const checkLogin = useCallback(async (url = window.location.href) => {
    console.log("### checkLogin", url)
    try {
      await auth0.handleRedirectCallback(url);
    } catch (e) {
      console.log("### error", e)
    }
    await auth0.getTokenSilently({
      cacheMode: 'off',
      authorizationParams: {
        appVariantIdentifier: 'agent' // custom param
      }
    });
    const {email} = await auth0.getIdTokenClaims()
    setEmail(email)
  }, [auth0])

  const appUrlOpen = useCallback(async ({url}) => {
    console.log("### url", url)
    await checkLogin(url)
    try {
      await Browser.close()
    } catch (e) {
      // somehow android throws this error but still works
      if (e.message !== 'not implemented') {
        throw e
      }
    }
  }, [checkLogin]);

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
  }, [isNative, checkLogin, appUrlOpen, auth0]);


  return (
    <div>
      <button onClick={login}>Login</button>
      <div>{email && `Logged in: ${email}`}</div>
    </div>
  );
}

export default Application;
