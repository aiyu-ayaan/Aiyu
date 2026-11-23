// `next/dynamic`: a lazy chunk with an optional loading component. Everything here is client-only, so `ssr` is ignored.
import { lazy, Suspense, type ComponentType } from 'react';

type Loader<P> = () => Promise<{ default: ComponentType<P> } | ComponentType<P>>;
type Options = { ssr?: boolean; loading?: ComponentType | (() => React.ReactNode) };

export default function dynamic<P extends object>(loader: Loader<P>, options: Options = {}): ComponentType<P> {
  const Lazy = lazy(async () => {
    const mod = await loader();
    return { default: ('default' in mod ? mod.default : mod) as ComponentType<P> };
  });
  const Loading = options.loading as ComponentType | undefined;
  function Dynamic(props: P) {
    return (
      <Suspense fallback={Loading ? <Loading /> : null}>
        <Lazy {...props} />
      </Suspense>
    );
  }
  return Dynamic;
}
