import { FaGithub, FaLinkedin, FaInstagram, FaEnvelope, FaCoffee } from 'react-icons/fa';
import { SiBuymeacoffee } from 'react-icons/si';

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
        case 'FaCoffee':
        case 'fa-coffee':
            return FaCoffee;
        case 'SiBuymeacoffee':
            return SiBuymeacoffee;
        default:
            return null;
    }
};
