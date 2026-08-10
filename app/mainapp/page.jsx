// app/mainapp/page.jsx
// Post-login landing. Login redirects here; send the user into the app.
import { redirect } from "next/navigation";

export default function MainAppIndex() {
  redirect("/mainapp/sites");
}
