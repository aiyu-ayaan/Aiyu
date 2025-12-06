"use client";

import { useState, useEffect } from 'react';

// Fallback data imports
import * as aboutDataFallback from '../app/data/aboutData';
import * as headerDataFallback from '../app/data/headerData';
import * as homeScreenDataFallback from '../app/data/homeScreenData';
import projectsDataFallback from '../app/data/projectsData';
import * as siteDataFallback from '../app/data/siteData';

// Use environment variable or dynamic URL detection
const API_BASE_URL = typeof window !== 'undefined' 
  ? '' // Client-side: use relative URLs
  : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'; // Server-side: configurable

// Helper function to fetch data with fallback
async function fetchWithFallback(endpoint, fallbackData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/${endpoint}`);
    if (!response.ok) {
      console.warn(`Failed to fetch ${endpoint}, using fallback data`);
      return fallbackData;
    }
    return await response.json();
  } catch (error) {
    console.warn(`Error fetching ${endpoint}, using fallback data:`, error);
    return fallbackData;
  }
}

export function useAboutData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithFallback('about', {
      name: aboutDataFallback.name,
      roles: aboutDataFallback.roles,
      professionalSummary: aboutDataFallback.professionalSummary,
      skills: aboutDataFallback.skills,
      experiences: aboutDataFallback.experiences,
      education: aboutDataFallback.education,
      certifications: aboutDataFallback.certifications,
    }).then((result) => {
      setData(result);
      setLoading(false);
    }).catch((error) => {
      console.error('Error in useAboutData:', error);
      setData({
        name: aboutDataFallback.name,
        roles: aboutDataFallback.roles,
        professionalSummary: aboutDataFallback.professionalSummary,
        skills: aboutDataFallback.skills,
        experiences: aboutDataFallback.experiences,
        education: aboutDataFallback.education,
        certifications: aboutDataFallback.certifications,
      });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useProjectsData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithFallback('projects', {
      projects: Array.isArray(projectsDataFallback) ? projectsDataFallback : [projectsDataFallback],
      roles: ['A collection of my work', 'Click on a project to learn more'],
    }).then((result) => {
      setData(result);
      setLoading(false);
    }).catch((error) => {
      console.error('Error in useProjectsData:', error);
      setData({
        projects: Array.isArray(projectsDataFallback) ? projectsDataFallback : [projectsDataFallback],
        roles: ['A collection of my work', 'Click on a project to learn more'],
      });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useHeaderData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithFallback('header', {
      navLinks: headerDataFallback.navLinks,
      contactLink: headerDataFallback.contactLink,
    }).then((result) => {
      setData(result);
      setLoading(false);
    }).catch((error) => {
      console.error('Error in useHeaderData:', error);
      setData({
        navLinks: headerDataFallback.navLinks,
        contactLink: headerDataFallback.contactLink,
      });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useSiteData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithFallback('site', {
      socials: siteDataFallback.socials,
    }).then((result) => {
      setData(result);
      setLoading(false);
    }).catch((error) => {
      console.error('Error in useSiteData:', error);
      setData({
        socials: siteDataFallback.socials,
      });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}

export function useHomeScreenData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWithFallback('homescreen', {
      name: homeScreenDataFallback.name,
      homeRoles: homeScreenDataFallback.homeRoles,
      githubLink: homeScreenDataFallback.githubLink,
      codeSnippets: homeScreenDataFallback.codeSnippets,
    }).then((result) => {
      setData(result);
      setLoading(false);
    }).catch((error) => {
      console.error('Error in useHomeScreenData:', error);
      setData({
        name: homeScreenDataFallback.name,
        homeRoles: homeScreenDataFallback.homeRoles,
        githubLink: homeScreenDataFallback.githubLink,
        codeSnippets: homeScreenDataFallback.codeSnippets,
      });
      setLoading(false);
    });
  }, []);

  return { data, loading };
}
