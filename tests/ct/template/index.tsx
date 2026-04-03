import { beforeMount } from "@playwright/experimental-ct-react/hooks";
import "../../../src/app/globals.css";

/** Import Tailwind CSS into the CT iframe for all component tests */
beforeMount(async ({ App }) => {
  return <App />;
});
