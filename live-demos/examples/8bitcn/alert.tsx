// The demo 8bitcn's docs page leads with, copied from
// https://github.com/TheOrcDev/8bitcn-ui/blob/9aedd7165837143803b95cdb2ab111923cf63efe/content/docs/components/alert.mdx
// (its first ComponentPreview). Only the "@/" import paths point at the vendored files.
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "../../vendor/8bitcn/components/ui/8bit/alert";

export default function Demo() {
  return (
    <>
      <Alert>
        <AlertTitle>Heads up!</AlertTitle>
        <AlertDescription>
          You can add components to your app using the cli.
        </AlertDescription>
      </Alert>
    </>
  );
}
