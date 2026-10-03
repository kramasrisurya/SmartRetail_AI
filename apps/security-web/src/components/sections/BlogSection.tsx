'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Container } from '../ui/Container';
import { SectionHeader } from '../ui/SectionHeader';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { blogPostsData } from '../../data/blog';
import { BlogPost } from '../../types';
import { Calendar, Clock, ArrowRight, User } from 'lucide-react';

export const BlogSection: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const featuredPost = blogPostsData.find((p) => p.featured) || blogPostsData[0];
  const sidePosts = blogPostsData.filter((p) => p.id !== featuredPost.id).slice(0, 3);

  return (
    <section id="blog" className="py-20 sm:py-24 bg-white relative border-b border-slate-200/80">
      <Container>
        {/* Header */}
        <SectionHeader
          eyebrow="Industry Insights & Whitepapers"
          title="Security Engineering, AI Innovations & Press Releases"
          description="Read the latest breakthroughs from our computer vision optical labs, cybersecurity hardening advisories, and domestic manufacturing updates."
        />

        {/* 1 Large Featured Article + 3 Side Articles */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-12">
          {/* Featured Article (Spans 7 on desktop) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            onClick={() => setSelectedPost(featuredPost)}
            className="lg:col-span-7 group bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer flex flex-col justify-between"
          >
            <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-200">
              <Image
                src={featuredPost.image}
                alt={featuredPost.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-4 left-4">
                <Badge variant="accent" size="md">
                  {featuredPost.category}
                </Badge>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-secondary" />
                  {featuredPost.date}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-secondary" />
                  {featuredPost.readTime}
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 group-hover:text-secondary transition-colors leading-tight">
                {featuredPost.title}
              </h3>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                {featuredPost.excerpt}
              </p>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative w-8 h-8 rounded-full overflow-hidden bg-slate-300">
                    <Image src={featuredPost.author.avatar} alt={featuredPost.author.name} fill className="object-cover" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block leading-tight">{featuredPost.author.name}</span>
                    <span className="text-[10px] text-slate-500 block">{featuredPost.author.role}</span>
                  </div>
                </div>

                <span className="text-xs font-bold text-secondary flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Read Article</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* 3 Smaller Articles (Spans 5 on desktop) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            {sidePosts.map((post, idx) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                onClick={() => setSelectedPost(post)}
                className="group bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-card hover:border-secondary/40 transition-all duration-300 cursor-pointer flex gap-4 items-center"
              >
                <div className="relative w-24 sm:w-28 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                  <Image src={post.image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>

                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" size="sm">
                      {post.category}
                    </Badge>
                    <span className="text-[10px] text-slate-400">{post.readTime}</span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 line-clamp-2 group-hover:text-secondary transition-colors leading-snug">
                    {post.title}
                  </h4>

                  <p className="text-[11px] text-slate-500 line-clamp-1">{post.excerpt}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </Container>

      {/* Blog Article Reader Modal */}
      {selectedPost && (
        <Modal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          title={selectedPost.category}
          maxWidth="4xl"
        >
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span>Published on {selectedPost.date}</span>
                <span>•</span>
                <span>{selectedPost.readTime}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-heading text-slate-900 leading-tight">
                {selectedPost.title}
              </h2>
            </div>

            <div className="relative h-64 sm:h-80 w-full rounded-xl overflow-hidden bg-slate-900">
              <Image src={selectedPost.image} alt={selectedPost.title} fill className="object-cover" />
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="relative w-10 h-10 rounded-full overflow-hidden bg-slate-300">
                <Image src={selectedPost.author.avatar} alt={selectedPost.author.name} fill className="object-cover" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">{selectedPost.author.name}</p>
                <p className="text-[11px] text-slate-500">{selectedPost.author.role}</p>
              </div>
            </div>

            <div className="prose prose-slate max-w-none text-xs sm:text-sm text-slate-700 leading-relaxed space-y-4">
              <p className="font-semibold text-slate-900 text-sm sm:text-base">{selectedPost.excerpt}</p>
              <p>{selectedPost.content}</p>
              <p>
                For technical integration inquiries, whitepaper PDF requests, or architecture design blueprints, contact our engineering advisory desk.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedPost(null)}>
                Close Article
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
};
