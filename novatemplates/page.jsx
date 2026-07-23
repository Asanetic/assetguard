import { Suspense } from 'react';
import ProductAnalytics from './grid1';

export default function MainGridtestListPage() {
const page_data = {
  static: {
    username: "Mateo Petty 👋",
    profile_bio: "My followers",
    userphoto: "/img/log-bg.jpg",
    posts_count: "289",
    courses_count: "12",
    followers_count: "947",
    post_title: "Long-awaited vacation",
    post_body: "Today I tell you about my vacation in Mexico...",
    post_likes: "2300",
    post_comments: "22",
    client_name: "Alba Bonner"
  },
  lists: {
    posts: [
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      },
      {
        username: "Mateo Petty 👋",
        profile_bio: "My followers",
        userphoto: "/img/log-bg.jpg",
        posts_count: "289",
        courses_count: "12",
        followers_count: "947",
        post_title: "Long-awaited vacation",
        post_body: "Today I tell you about my vacation in Mexico...",
        post_likes: "2300",
        post_comments: "22",
        client_name: "Alba Bonner"
      }
    ]
  }
};


  return (
    <div className="main-wrapper">
      <div className="page-wrapper">
        <div className="content container-fluid p-2 m-0">
          <Suspense fallback={<div>Loading...</div>}>
            <ProductAnalytics page_data={page_data} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
