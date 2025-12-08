import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope } from 'react-icons/fa';

export const getIconByName = (name) => {
    switch (name) {
        case 'FaGithub':
            return FaGithub;
        case 'FaLinkedin':
            return FaLinkedin;
        case 'FaInstagram':
            return FaInstagram;
        case 'FaEnvelope':
            return FaEnvelope;
        default:
            return null;
    }
};
