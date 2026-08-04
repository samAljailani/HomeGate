import * as React from "react"

export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false)

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(query)
    const onChange = (event: MediaQueryListEvent) => setValue(event.matches)

    mediaQueryList.addEventListener("change", onChange)
    setValue(mediaQueryList.matches)

    return () => mediaQueryList.removeEventListener("change", onChange)
  }, [query])

  return value
}
