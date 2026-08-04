import Image from 'next/image';
import logo from '../img/logo/logo.png'; // outside public!


export function UserLongCard({ editLink, photoNode, node1, node2, node3 }) {
  
  let finalImage=photoNode;
  
  if(photoNode=="")
  {
    finalImage=logo.src
  }
  
  return (
    <a href={editLink} className="row bg-white text-primary rounded_meduim pt-2 pb-2 justify-content-center col-md-7 mb-2 shadow-sm border border-light">
      <div className="col-md-2 pt-3 text-center">
        <img src={finalImage} className="useravatar_small shadow-sm" />
      </div>
      <div className="col-10 text-left p-0" style={{ fontSize: '14px' }}>
        <div className="p-1"><span className="h5">{node1}</span></div>
        <div className="p-1"><span>{node2}</span></div>
        <div className="text-info p-1"><em>{node3}</em></div>
      </div>
    </a>
  );
}


export function IconListBadge({ editLink, photoNode, node1, node2, node3 }) {
  return (
    <a href={editLink} className="bg-white text-primary rounded mb-3 mr-lg-3 justify-content-center col-md-3 border shadow-sm">
      <div className="row p-0 m-0">
        <div className="col-md-2 pt-4 text-center">
          <i className={`fa fa-${photoNode}`}></i>
        </div>
        <div className="col-10 text-left" style={{ fontSize: '14px' }}>
          <div className="p-1"><b>{node1}</b></div>
          <div className="p-1"><span>{node2}</span></div>
          <div className="text-info p-1"><em>{node3}</em></div>
        </div>
      </div>
    </a>
  );
}


export function LongContentCard({ editLink, node1, node2, node3 }) {
  return (
    <>
      <a href={editLink} className="row bg-white text-primary rounded_meduim pt-2 pb-2 mb-1 justify-content-center col-md-6 shadow-sm border border-light">
        <div className="col-12 text-left p-0" style={{ fontSize: '14px' }}>
          <div className="p-1"><span className="h5">{node1}</span></div>
          <div className="p-1"><span>{node2}</span></div>
          <div className="text-info p-1"><em>{node3}</em></div>
        </div>
      </a>
      <div className="col-md-12 p-0"></div>
    </>
  );
}


export function BlogCard({ editLink, photoNode, node1, node2, node3 }) {
  
  let finalImage=photoNode;
  
  if(photoNode=="")
  {
    finalImage=logo.src
  }
  
  return (
    <a href={editLink} className="bg-white text-primary rounded p-0 mb-3 mr-lg-3 justify-content-center col-md-3 border shadow-sm" style={{ position: 'relative' }}>
      <div className="col-md-12 p-0 text-center">
        <div style={{ position: 'relative', width: '100%', height: '200px', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', width: '100%', height: '100%', backgroundImage: `url(${finalImage})`, filter: 'blur(8px)' }}></div>
          <div style={{ position: 'absolute', width: '100%', height: '100%' }}>
            <img src={finalImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
        </div>
      </div>
      <div className="col-12 text-left p-3 border-top mb-3">
        <div className="p-1"><span className="h5">{node1}</span></div>
        <div className="p-1 text-muted"><span>{node2}</span></div>
        <div className="text-info p-1"><em>{node3}</em></div>
      </div>
      <div className="col-md-12 p-0 text-right pt-3" style={{ position: 'absolute', bottom: '20px', right: '15px' }}>
        <span className="cpointer badge text-info">View more <i className="fa fa-arrow-right"></i></span>
      </div>
    </a>
  );
}


export function PlainBlogCard({ editLink, node1, node2, node3 }) {
  return (
    <a href={editLink} className="bg-white text-primary rounded p-0 mb-3 mr-lg-3 justify-content-center col-md-3 border shadow-sm" style={{ position: 'relative' }}>
      <div className="col-12 text-left p-3 border-top mb-3">
        <div className="p-1"><span className="h5">{node1}</span></div>
        <div className="p-1 text-muted"><span>{node2}</span></div>
        <div className="text-info p-1"><em>{node3}</em></div>
      </div>
      <div className="col-md-12 p-0 text-right pt-3" style={{ position: 'absolute', bottom: '20px', right: '15px' }}>
        <span className="cpointer badge text-info">View more <i className="fa fa-arrow-right"></i></span>
      </div>
    </a>
  );
}


export function UserListCard({ editLink, photoNode, node1, node2, node3, node4 }) {
  
  let finalImage=photoNode;
  
  if(photoNode=="")
  {
    finalImage=logo.src
  }
  
  return (
    <a href={editLink} className="bg-white text-primary rounded p-0 mb-3 mr-lg-3 justify-content-center col-md-2 border shadow">
      <div className="col-md-12 p-4 text-center">
        <img src={finalImage} className="shadow-sm" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
      </div>
      <div className="col-12 text-left p-3 border-top">
        <div className="p-1"><span className="h6">{node1}</span></div>
        <div className="p-1 text-muted"><span>{node2}</span></div>
        <div className="text-info p-0 col-md-12 mb-0"><span className="badge text-secondary"><i className="fa fa-envelope"></i> {node3}</span></div>
        <div className="text-info p-0 col-md-12"><span className="badge text-secondary"><i className="fa fa-phone"></i> {node4}</span></div>
      </div>
    </a>
  );
}

export function TimelineCard({ editLink, node1, node2, node3, node4 }) {
  return (
    <a href={editLink} className="row rounded_medium col-md-8 pb-3 mb-0 justify-content-left p-0 m-0 text-dark">
      <div className="col-2 col-lg-1 text-left m-0 p-0">
        <div style={{ zIndex: 5, position: 'absolute', top: '30%' }} className="useravatar_small border ctn_set">
          <i className="fa fa-envelope medium_icon ml-2 mt-2"></i>
        </div>
        <div className="m-2 ml-4 pb-0 pt-0 col-md-12 border-left border_set" style={{ position: 'absolute', bottom: '0px', top: '0%', zIndex: 1 }}>
          <div className="p-0"></div>
        </div>
      </div>
      <div className="col-10 col-lg-10 border shadow rounded_big p-4">
        <div className="p-2">
          <b>{node3}</b>
          <span className="text-muted badge pt-2 float-right">{node1}</span>
        </div>
        <div className="col-md-12 pt-lg-0 pt-1 p-0">{node2}</div>
        <div className="text-muted p-2 border-top col-md-12" style={{ fontSize: '12px', wordWrap: 'break-word' }}><em>{node4}</em></div>
      </div>
    </a>
  );
}


