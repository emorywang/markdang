import { render } from 'preact'
import { App } from '../options/App'
import '../options/options.css'
import './popup.css'

render(<App variant="popup" />, document.getElementById('app')!)
