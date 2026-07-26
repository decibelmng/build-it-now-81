import RootRedirect from "./RootRedirect";

/**
 * Legacy top-level routes redirect to their new /p/:slug home. We resolve the
 * target slug via the same rules RootRedirect uses (last visited > only one >
 * /portfolio), then append the given subpath.
 */
const LegacyRedirect = ({ subpath }: { subpath: string }) => <RootRedirect subpath={subpath} />;

export default LegacyRedirect;
