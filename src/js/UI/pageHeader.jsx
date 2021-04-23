import React, {Component} from 'react'

class PageHeader extends Component {
  render() {
    return (
      <div className='Page-header'>
        <h1>
          <span style={{"text-shadow": "2px 1px 2px #EB0072"}}>Music</span> <span style={{"text-shadow": "2px 1px 2px #E66F00"}}>For</span> <span style={{"text-shadow": "2px 1px 2px #33CB30"}}>Me ♪</span>
        </h1>
      </div>
    )
  }
}

export default PageHeader