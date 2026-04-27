import admin from 'firebase-admin';

type SignInWithCustomTokenResponse = {
  idToken: string;
  refreshToken: string;
  expiresIn: string;
  isNewUser?: boolean;
};

function initFirebaseAdmin(firebaseServiceAccountJson: string) {
  if (admin.apps.length > 0) return;
  const serviceAccount = JSON.parse(firebaseServiceAccountJson);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

export async function mintCustomToken(args: { firebaseServiceAccountJson: string; uid: string }): Promise<string> {
  initFirebaseAdmin(args.firebaseServiceAccountJson);
  return await admin.auth().createCustomToken(args.uid);
}

export async function exchangeCustomTokenForIdToken(args: {
  firebaseWebApiKey: string;
  customToken: string;
}): Promise<string> {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${encodeURIComponent(
    args.firebaseWebApiKey
  )}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: args.customToken, returnSecureToken: true })
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '<failed to read body>');
    throw new Error(`IdentityToolkit exchange failed: ${res.status} ${res.statusText}: ${text}`);
  }

  const data = (await res.json()) as Partial<SignInWithCustomTokenResponse>;
  if (!data.idToken) throw new Error('IdentityToolkit response missing idToken');
  return data.idToken;
}

export async function getFirebaseIdToken(args: {
  firebaseServiceAccountJson: string;
  firebaseWebApiKey: string;
  uid: string;
}): Promise<string> {
  const customToken = await mintCustomToken({
    firebaseServiceAccountJson: args.firebaseServiceAccountJson,
    uid: args.uid
  });
  return await exchangeCustomTokenForIdToken({ firebaseWebApiKey: args.firebaseWebApiKey, customToken });
}

