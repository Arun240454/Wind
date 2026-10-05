import { redirect } from 'next/navigation';

/** Auth.js appends ?provider=…&type=… to verifyRequest; this keeps the login URL clean. */
export default function CheckEmail() {
  redirect('/login?sent=1');
}
