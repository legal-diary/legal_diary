'use client';

import React, { useState } from 'react';
import {
  Card,
  Button,
  Spin,
  message,
  Input,
  Checkbox,
  Collapse,
  Space,
  Empty,
  Tag,
  Row,
  Col,
  Alert,
} from 'antd';
import { ThunderboltOutlined, LoadingOutlined } from '@ant-design/icons';

interface FileDocument {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface AISummary {
  summary: string;
  keyPoints: string[];
  insights: string;
  updatedAt?: string;
}

interface AIAnalysisTabProps {
  caseId: string;
  caseTitle: string;
  aiSummary?: AISummary;
  fileDocuments: FileDocument[];
  token: string;
  onAnalysisComplete: () => void;
}

export default function AIAnalysisTab({
  caseId,
  caseTitle,
  aiSummary,
  fileDocuments,
  token,
  onAnalysisComplete,
}: AIAnalysisTabProps) {
  const [reanalyzeLoading, setReanalyzeLoading] = useState(false);
  const [documentAnalysisLoading, setDocumentAnalysisLoading] = useState(false);
  const [customAnalysisLoading, setCustomAnalysisLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [documentAnalysisResult, setDocumentAnalysisResult] = useState<any>(null);
  const [customAnalysisResult, setCustomAnalysisResult] = useState<any>(null);

  const handleReanalyze = async () => {
    setReanalyzeLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/ai/reanalyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        message.success('Case re-analyzed successfully');
        onAnalysisComplete();
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to re-analyze case');
      }
    } catch (error) {
      message.error('Failed to re-analyze case');
      console.error(error);
    } finally {
      setReanalyzeLoading(false);
    }
  };

  const handleAnalyzeDocuments = async () => {
    if (selectedDocuments.length === 0) {
      message.warning('Please select at least one document');
      return;
    }

    setDocumentAnalysisLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/ai/analyze-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ documentIds: selectedDocuments }),
      });

      if (response.ok) {
        const data = await response.json();
        setDocumentAnalysisResult(data.analysis);
        message.success('Documents analyzed successfully');
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to analyze documents');
      }
    } catch (error) {
      message.error('Failed to analyze documents');
      console.error(error);
    } finally {
      setDocumentAnalysisLoading(false);
    }
  };

  const handleCustomAnalysis = async () => {
    if (!customPrompt.trim()) {
      message.warning('Please enter a question or prompt');
      return;
    }

    setCustomAnalysisLoading(true);
    try {
      const response = await fetch(`/api/cases/${caseId}/ai/custom-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: customPrompt,
          documentIds: selectedDocuments.length > 0 ? selectedDocuments : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCustomAnalysisResult(data.analysis);
        message.success('Analysis completed');
      } else {
        const error = await response.json();
        message.error(error.error || 'Failed to perform analysis');
      }
    } catch (error) {
      message.error('Failed to perform analysis');
      console.error(error);
    } finally {
      setCustomAnalysisLoading(false);
    }
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Case Re-analysis Section */}
      <Card title="Case Analysis" variant="outlined">
        <Alert
          message="Re-analyze this case with updated details and documents"
          type="info"
          showIcon
          style={{ marginBottom: '1rem' }}
        />
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleReanalyze}
          loading={reanalyzeLoading}
          block
        >
          {reanalyzeLoading ? 'Re-analyzing...' : 'Re-analyze Case with All Documents'}
        </Button>

        {aiSummary && (
          <Card style={{ marginTop: '1.5rem' }} type="inner">
            <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem' }}>
              Last analyzed: {new Date(aiSummary.updatedAt || '').toLocaleString()}
            </p>

            <Card.Meta
              title="Summary"
              description={aiSummary.summary}
              style={{ marginBottom: '1.5rem' }}
            />

            <Card.Meta
              title="Key Points"
              description={
                <ul>
                  {(Array.isArray(aiSummary.keyPoints)
                    ? aiSummary.keyPoints
                    : typeof aiSummary.keyPoints === 'string'
                      ? JSON.parse(aiSummary.keyPoints)
                      : []
                  ).map((point: string, index: number) => (
                    <li key={index} style={{ marginBottom: '0.5rem' }}>
                      {point}
                    </li>
                  ))}
                </ul>
              }
              style={{ marginBottom: '1.5rem' }}
            />

            <Card.Meta
              title="Insights & Recommendations"
              description={aiSummary.insights}
            />
          </Card>
        )}

        {!aiSummary && (
          <Empty
            description="No analysis available yet"
            style={{ marginTop: '1.5rem' }}
          />
        )}
      </Card>

      {/* Document Analysis Section */}
      {fileDocuments.length > 0 && (
        <Card title="Document Analysis" variant="outlined">
          <Alert
            message="Select documents to analyze and get AI-powered insights"
            type="info"
            showIcon
            style={{ marginBottom: '1rem' }}
          />

          <Card type="inner" style={{ marginBottom: '1rem' }}>
            <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Select Documents:
            </p>
            {fileDocuments.map((doc) => (
              <div key={doc.id} style={{ marginBottom: '0.5rem' }}>
                <Checkbox
                  checked={selectedDocuments.includes(doc.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedDocuments([...selectedDocuments, doc.id]);
                    } else {
                      setSelectedDocuments(
                        selectedDocuments.filter((id) => id !== doc.id)
                      );
                    }
                  }}
                >
                  {doc.fileName} ({(doc.fileSize / 1024).toFixed(2)} KB)
                </Checkbox>
              </div>
            ))}
          </Card>

          <Button
            type="primary"
            onClick={handleAnalyzeDocuments}
            loading={documentAnalysisLoading}
            disabled={selectedDocuments.length === 0}
            block
          >
            {documentAnalysisLoading
              ? 'Analyzing Documents...'
              : 'Analyze Selected Documents'}
          </Button>

          {documentAnalysisResult && (
            <Card style={{ marginTop: '1.5rem' }} type="inner">
              <Card.Meta
                title="Document Analysis Summary"
                description={documentAnalysisResult.summary}
                style={{ marginBottom: '1.5rem' }}
              />

              <Card.Meta
                title="Key Findings"
                description={
                  <ul>
                    {documentAnalysisResult.keyFindings.map(
                      (finding: string, index: number) => (
                        <li key={index} style={{ marginBottom: '0.5rem' }}>
                          {finding}
                        </li>
                      )
                    )}
                  </ul>
                }
                style={{ marginBottom: '1.5rem' }}
              />

              <Card.Meta
                title="Identified Risks"
                description={
                  <ul>
                    {documentAnalysisResult.risks.map((risk: string, index: number) => (
                      <li key={index} style={{ marginBottom: '0.5rem' }}>
                        <Tag color="red">{risk}</Tag>
                      </li>
                    ))}
                  </ul>
                }
                style={{ marginBottom: '1.5rem' }}
              />

              <Card.Meta
                title="Recommendations"
                description={
                  <ul>
                    {documentAnalysisResult.recommendations.map(
                      (rec: string, index: number) => (
                        <li key={index} style={{ marginBottom: '0.5rem' }}>
                          <Tag color="green">{rec}</Tag>
                        </li>
                      )
                    )}
                  </ul>
                }
              />
            </Card>
          )}
        </Card>
      )}

      {/* Custom Analysis Section */}
      <Card title="Custom Analysis" variant="outlined">
        <Alert
          message="Ask AI a specific question about this case"
          type="info"
          showIcon
          style={{ marginBottom: '1rem' }}
        />

        <Card type="inner" style={{ marginBottom: '1rem' }}>
          <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Your Question:
          </p>
          <Input.TextArea
            rows={4}
            placeholder="E.g., What are the strongest points in our case? What counterarguments should we prepare for?"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            disabled={customAnalysisLoading}
          />

          {fileDocuments.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <p style={{ marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem' }}>
                Include Documents (Optional):
              </p>
              {fileDocuments.map((doc) => (
                <div key={doc.id} style={{ marginBottom: '0.5rem' }}>
                  <Checkbox
                    checked={selectedDocuments.includes(doc.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDocuments([...selectedDocuments, doc.id]);
                      } else {
                        setSelectedDocuments(
                          selectedDocuments.filter((id) => id !== doc.id)
                        );
                      }
                    }}
                  >
                    {doc.fileName}
                  </Checkbox>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Button
          type="primary"
          onClick={handleCustomAnalysis}
          loading={customAnalysisLoading}
          disabled={!customPrompt.trim()}
          block
        >
          {customAnalysisLoading ? 'Analyzing...' : 'Get AI Analysis'}
        </Button>

        {customAnalysisResult && (
          <Card style={{ marginTop: '1.5rem' }} type="inner">
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {customAnalysisResult.analysis}
            </p>
          </Card>
        )}
      </Card>
    </Space>
  );
}
