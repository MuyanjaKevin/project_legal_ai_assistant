// frontend/src/components/RiskAssessment.js

import React, { useState, useEffect } from 'react';
import { 
  Typography, Paper, Box, CircularProgress, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Rating, Accordion, AccordionSummary, AccordionDetails, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningIcon from '@mui/icons-material/Warning';
import { assessContractRisks } from '../services/advancedAnalysis';

const RiskAssessment = ({ documentId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [riskData, setRiskData] = useState(null);
  
  useEffect(() => {
    const loadRiskAssessment = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const results = await assessContractRisks(documentId);
        setRiskData(results);
      } catch (err) {
        setError(err.message || "Failed to load risk assessment");
      } finally {
        setLoading(false);
      }
    };
    
    loadRiskAssessment();
  }, [documentId]);
  
  const getRiskColor = (score) => {
    if (score <= 3) return "success";
    if (score <= 6) return "warning";
    return "error";
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Analyzing contract for legal risks...
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (!riskData) {
    return <Typography>No risk assessment data available</Typography>;
  }
  
  return (
    <Box sx={{ mt: 2, mb: 4 }}>
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2" sx={{ flexGrow: 1 }}>
            Risk Assessment Summary
          </Typography>
          <Chip 
            label={`Risk Score: ${riskData.risk_score}/10`}
            color={getRiskColor(riskData.risk_score)}
            icon={<WarningIcon />}
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
        
        <Typography variant="body1" sx={{ mb: 2 }}>
          {riskData.risk_summary}
        </Typography>
      </Paper>
      
      <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
        Identified Risks
      </Typography>
      
      {riskData.identified_risks.length === 0 ? (
        <Alert severity="success">No significant risks identified in this contract.</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Clause/Section</TableCell>
                <TableCell>Issue</TableCell>
                <TableCell>Risk Level</TableCell>
                <TableCell>Recommendation</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {riskData.identified_risks.map((risk, index) => (
                <TableRow key={index}>
                  <TableCell>{risk.clause}</TableCell>
                  <TableCell>{risk.issue}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Rating 
                        value={risk.risk_score / 2} 
                        precision={0.5} 
                        readOnly 
                        max={5}
                      />
                      <Chip 
                        label={risk.risk_score} 
                        size="small"
                        color={getRiskColor(risk.risk_score)}
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>{risk.recommendation}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {riskData.missing_elements && riskData.missing_elements.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography color="error">
                Missing Elements ({riskData.missing_elements.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ul>
                {riskData.missing_elements.map((element, index) => (
                  <li key={index}>{element}</li>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}
    </Box>
  );
};

export default RiskAssessment;